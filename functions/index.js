const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');

initializeApp();

const stripeSecret = defineSecret('STRIPE_SECRET');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/**
 * Raw HTTPS call to the Stripe API (no SDK).
 * Returns the parsed JSON response.
 */
function stripeRequest(method, path, key, formData) {
  const postBody = formData ? querystring.stringify(formData) : '';
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postBody),
      },
    };

    console.log(`Stripe raw HTTPS ${method} ${path}`);

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log(`Stripe response status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const msg = parsed.error?.message || `HTTP ${res.statusCode}`;
            console.error('Stripe API error:', msg);
            reject(new Error(msg));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON from Stripe: ${body.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('HTTPS request error:', e.message);
      reject(e);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Stripe request timeout after 30s'));
    });

    req.write(postBody);
    req.end();
  });
}

/**
 * Listens for new documents in usuarios/{uid}/checkout_sessions.
 * Creates a Stripe Checkout Session via raw HTTPS and writes the URL back.
 */
exports.createCheckoutSession = onDocumentCreated(
  {
    document: 'usuarios/{uid}/checkout_sessions/{sessionId}',
    secrets: [stripeSecret],
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { uid } = event.params;
    const { price, success_url, cancel_url } = snap.data();

    console.log('Creating checkout session for user:', uid, 'price:', price);

    // Strip ALL non-printable / non-ASCII characters from the secret
    const key = stripeSecret.value().replace(/[^\x20-\x7E]/g, '');
    console.log('Stripe key length:', key.length, 'starts with:', key ? key.substring(0, 7) + '...' : 'EMPTY');

    try {
      const userRecord = await getAuth().getUser(uid);

      const session = await stripeRequest('POST', '/v1/checkout/sessions', key, {
        mode: 'subscription',
        customer_email: userRecord.email,
        'line_items[0][price]': price,
        'line_items[0][quantity]': '1',
        success_url,
        cancel_url,
        'metadata[firebaseUID]': uid,
      });

      console.log('Checkout session created:', session.id);
      await snap.ref.update({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error('Checkout error:', error.message);
      await snap.ref.update({ error: { message: error.message } });
    }
  },
);

/**
 * Verifies a Stripe webhook signature manually (no SDK needed).
 */
function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    throw new Error('Invalid Stripe signature header');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  if (expected !== signature) {
    throw new Error('Webhook signature verification failed');
  }

  // Reject timestamps older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) {
    throw new Error('Webhook timestamp too old');
  }

  return JSON.parse(payload);
}

/**
 * Stripe Webhook — handles subscription events.
 * Uses manual signature verification (no outbound network needed).
 */
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecret, stripeWebhookSecret] },
  async (req, res) => {
    let event;
    try {
      event = verifyStripeSignature(
        req.rawBody.toString('utf8'),
        req.headers['stripe-signature'],
        stripeWebhookSecret.value().replace(/[^\x20-\x7E]/g, ''),
      );
    } catch (err) {
      console.error('Webhook verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const db = getFirestore();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid = session.metadata.firebaseUID;
        if (uid) {
          await db.doc(`usuarios/${uid}`).update({
            plan: 'premium',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = event.data.object.customer;
        const snapshot = await db
          .collection('usuarios')
          .where('stripe_customer_id', '==', customerId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({ plan: 'gratuito' });
        }
        break;
      }
    }

    res.json({ received: true });
  },
);

/**
 * Diagnostic: test raw HTTPS connectivity to api.stripe.com.
 * DELETE this function once payments are working.
 */
exports.testStripeConnectivity = onRequest(async (req, res) => {
  const results = {};

  // Test 1: raw HTTPS GET to api.stripe.com
  try {
    const raw = await new Promise((resolve, reject) => {
      const r = https.get('https://api.stripe.com', (response) => {
        let body = '';
        response.on('data', (d) => (body += d));
        response.on('end', () =>
          resolve({ status: response.statusCode, body: body.substring(0, 200) }),
        );
      });
      r.on('error', reject);
      r.setTimeout(10000, () => {
        r.destroy();
        reject(new Error('Timeout after 10s'));
      });
    });
    results.rawHttps = { success: true, ...raw };
  } catch (e) {
    results.rawHttps = { success: false, error: e.message };
  }

  // Test 2: DNS resolution
  const dns = require('dns');
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4('api.stripe.com', (err, addrs) => {
        if (err) reject(err);
        else resolve(addrs);
      });
    });
    results.dns = { success: true, addresses };
  } catch (e) {
    results.dns = { success: false, error: e.message };
  }

  results.nodeVersion = process.version;

  res.json(results);
});
