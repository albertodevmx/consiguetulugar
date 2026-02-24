const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');

initializeApp();

const stripeSecret = defineSecret('STRIPE_SECRET');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

/**
 * Raw HTTPS call to the Stripe API (no SDK).
 */
function stripeRequest(method, path, key, formData) {
  const postBody = formData ? querystring.stringify(formData) : '';
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.stripe.com',
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postBody),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON: ${body.substring(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Stripe request timeout'));
    });
    req.write(postBody);
    req.end();
  });
}

/**
 * Creates a Stripe Embedded Checkout session.
 * Called directly from the frontend via HTTP POST.
 */
exports.createEmbeddedCheckout = onRequest(
  { secrets: [stripeSecret], cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      res.status(401).json({ error: 'Missing authentication' });
      return;
    }

    try {
      const token = await getAuth().verifyIdToken(match[1]);
      const key = stripeSecret.value().replace(/[^\x20-\x7E]/g, '');
      const { priceId, returnUrl, examenId, examenNombre } = req.body;

      const session = await stripeRequest('POST', '/v1/checkout/sessions', key, {
        ui_mode: 'embedded',
        mode: 'subscription',
        customer_email: token.email,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        'metadata[firebaseUID]': token.uid,
        'metadata[examenId]': examenId || '',
        'metadata[examenNombre]': examenNombre || '',
      });

      res.json({ clientSecret: session.client_secret });
    } catch (error) {
      console.error('Embedded checkout error:', error.message);
      res.status(500).json({ error: error.message });
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
  if (!timestamp || !signature) throw new Error('Invalid Stripe signature header');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  if (expected !== signature) throw new Error('Webhook signature verification failed');

  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) throw new Error('Webhook timestamp too old');

  return JSON.parse(payload);
}

/**
 * Stripe Webhook — handles subscription events.
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
        const examenId = session.metadata.examenId;

        if (uid) {
          const updateData = {
            plan: 'premium',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          };

          // Add the exam to the user's paid exams list
          if (examenId) {
            updateData.examenes_pagados = FieldValue.arrayUnion(examenId);
          }

          await db.doc(`usuarios/${uid}`).update(updateData);
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
