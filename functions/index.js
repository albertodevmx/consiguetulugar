const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const Stripe = require('stripe');
const https = require('https');

initializeApp();

const stripeSecret = defineSecret('STRIPE_SECRET');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/**
 * Listens for new documents in usuarios/{uid}/checkout_sessions.
 * Creates a Stripe Checkout Session and writes the URL back.
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

    const key = stripeSecret.value();
    console.log('Stripe key starts with:', key ? key.substring(0, 7) + '...' : 'EMPTY');

    const stripe = new Stripe(key, {
      maxNetworkRetries: 3,
      timeout: 30000,
    });

    try {
      const userRecord = await getAuth().getUser(uid);

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: userRecord.email,
        line_items: [{ price, quantity: 1 }],
        success_url,
        cancel_url,
        metadata: { firebaseUID: uid },
      });

      console.log('Checkout session created:', session.id);
      await snap.ref.update({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error('Stripe error:', error.type, error.message);
      await snap.ref.update({ error: { message: error.message } });
    }
  },
);

/**
 * Stripe Webhook — handles subscription events.
 */
exports.stripeWebhook = onRequest(
  { secrets: [stripeSecret, stripeWebhookSecret] },
  async (req, res) => {
    const stripe = new Stripe(stripeSecret.value(), {
      maxNetworkRetries: 3,
      timeout: 30000,
    });

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        stripeWebhookSecret.value(),
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
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
 * Call this URL in the browser to check if Cloud Functions can reach Stripe.
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

  // Test 3: Stripe SDK version info
  results.stripeVersion = require('stripe/package.json').version;
  results.nodeVersion = process.version;

  res.json(results);
});
