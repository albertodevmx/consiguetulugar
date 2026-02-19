/**
 * Firebase Cloud Functions for Stripe Checkout
 *
 * SETUP:
 * 1. cd functions && npm init -y && npm install firebase-functions firebase-admin stripe
 * 2. firebase functions:config:set stripe.secret="sk_live_YOUR_SECRET_KEY"
 * 3. firebase deploy --only functions
 *
 * Or use environment variables:
 *   firebase functions:secrets:set STRIPE_SECRET
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');

admin.initializeApp();

/**
 * Listens for new documents in usuarios/{uid}/checkout_sessions.
 * Creates a Stripe Checkout Session and writes the URL back.
 */
exports.createCheckoutSession = functions.firestore
  .document('usuarios/{uid}/checkout_sessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const { uid } = context.params;
    const { price, success_url, cancel_url } = snap.data();

    const stripeClient = stripe(functions.config().stripe.secret);

    // Get user email from Firebase Auth
    const userRecord = await admin.auth().getUser(uid);

    try {
      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        customer_email: userRecord.email,
        line_items: [{ price, quantity: 1 }],
        success_url,
        cancel_url,
        metadata: { firebaseUID: uid },
      });

      await snap.ref.update({ url: session.url, sessionId: session.id });
    } catch (error) {
      await snap.ref.update({ error: { message: error.message } });
    }
  });

/**
 * Stripe Webhook — handles subscription events.
 * Updates the user's plan in Firestore.
 *
 * SETUP:
 * 1. In Stripe Dashboard > Webhooks, add endpoint:
 *    https://us-central1-estudiarbarato.cloudfunctions.net/stripeWebhook
 * 2. Subscribe to: checkout.session.completed, customer.subscription.deleted
 * 3. firebase functions:config:set stripe.webhook_secret="whsec_..."
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const stripeClient = stripe(functions.config().stripe.secret);
  const webhookSecret = functions.config().stripe.webhook_secret;

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      req.rawBody,
      req.headers['stripe-signature'],
      webhookSecret,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = admin.firestore();

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
      // Find user by stripe customer ID and downgrade
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
});
