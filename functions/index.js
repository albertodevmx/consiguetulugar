const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const Stripe = require('stripe');

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
