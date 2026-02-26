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
  { secrets: [stripeSecret], cors: true, invoker: 'public' },
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
  { secrets: [stripeSecret, stripeWebhookSecret], invoker: 'public' },
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

/**
 * Raw HTTPS call to the OpenAI Chat Completions API (no SDK).
 */
function openaiRequest(apiKey, model, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model, messages, temperature: 0.7 });

    const req = https.request(
      {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON from OpenAI: ${data.substring(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('OpenAI request timeout'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Generates exam questions using OpenAI and saves them to the preguntas collection.
 * Admin-only endpoint.
 */
exports.generateQuestions = onRequest(
  { cors: true, timeoutSeconds: 120, invoker: 'public' },
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
      const db = getFirestore();

      // Verify admin role
      const userDoc = await db.doc(`usuarios/${token.uid}`).get();
      if (!userDoc.exists || userDoc.data().rol !== 'admin') {
        res.status(403).json({ error: 'Solo administradores pueden generar preguntas' });
        return;
      }

      // Read OpenAI config from Firestore
      const configDoc = await db.doc('configuracion/openai').get();
      if (!configDoc.exists || !configDoc.data().apiKey) {
        res.status(400).json({ error: 'API Key de OpenAI no configurada. Ve a Configuracion en el dashboard.' });
        return;
      }
      const { apiKey, model: aiModel } = configDoc.data();

      const { topicId, topicName, count = 5, context = '', materiaId = '' } = req.body;
      if (!topicId || !topicName) {
        res.status(400).json({ error: 'topicId y topicName son requeridos' });
        return;
      }

      const numQuestions = Math.min(Math.max(1, parseInt(count)), 50);

      const prompt = `Genera exactamente ${numQuestions} preguntas de opcion multiple para un examen de admision universitario sobre el tema "${topicName}"${context ? ` (area: ${context})` : ''}.

Cada pregunta debe tener:
- Un texto claro y preciso de la pregunta
- Exactamente 4 opciones de respuesta
- Solo una opcion correcta
- Una explicacion breve para cada opcion
- Un nivel de dificultad: 1 (facil), 2 (medio), o 3 (dificil)
- Tags relevantes al tema

Responde UNICAMENTE con un JSON array valido con este formato:
[
  {
    "texto": "¿Pregunta aqui?",
    "opciones": [
      { "texto": "Opcion A", "explicacion": "Por que es o no correcta", "es_correcta": false },
      { "texto": "Opcion B", "explicacion": "Por que es o no correcta", "es_correcta": true },
      { "texto": "Opcion C", "explicacion": "Por que es o no correcta", "es_correcta": false },
      { "texto": "Opcion D", "explicacion": "Por que es o no correcta", "es_correcta": false }
    ],
    "dificultad": 2,
    "tags": ["tag1", "tag2"]
  }
]

IMPORTANTE: Solo el JSON array, sin markdown, sin texto extra, sin bloques de codigo.`;

      const openaiRes = await openaiRequest(apiKey, aiModel || 'gpt-4o-mini', [
        {
          role: 'system',
          content: 'Eres un experto en crear preguntas de examen de admision universitario en Mexico. Genera preguntas precisas, variadas en dificultad, y con explicaciones educativas. Responde solo con JSON valido.',
        },
        { role: 'user', content: prompt },
      ]);

      // Parse the response
      let questions;
      try {
        let content = openaiRes.choices[0].message.content.trim();
        // Strip markdown code fences if present
        content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
        questions = JSON.parse(content);
        if (!Array.isArray(questions)) throw new Error('Not an array');
      } catch (e) {
        console.error('OpenAI parse error. Raw:', openaiRes.choices?.[0]?.message?.content?.substring(0, 500));
        res.status(500).json({ error: 'Error al parsear la respuesta de OpenAI. Intenta de nuevo.' });
        return;
      }

      // Save to preguntas collection
      const batch = db.batch();
      const col = db.collection('preguntas');

      for (const q of questions) {
        const ref = col.doc();
        batch.set(ref, {
          texto: q.texto,
          opciones: (q.opciones || []).map((o) => ({
            texto: o.texto || '',
            explicacion: o.explicacion || '',
            es_correcta: !!o.es_correcta,
          })),
          dificultad: q.dificultad || 2,
          tema_id: topicId,
          materia_id: materiaId || '',
          imagen_url: null,
          imagen_descripcion: null,
          tags: q.tags || [],
          stats: {
            veces_respondida: 0,
            veces_correcta: 0,
            ratio_acierto: 0,
            ratio_por_opcion: [0, 0, 0, 0],
          },
          creada_por: 'openai-auto',
          revisada: false,
          fecha_creacion: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      res.json({ generated: questions.length });
    } catch (error) {
      console.error('Generate questions error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Generates a structured HTML lesson for a topic using OpenAI and saves it to the tema document.
 * Admin-only endpoint.
 */
exports.generateLesson = onRequest(
  { cors: true, timeoutSeconds: 120, invoker: 'public' },
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
      const db = getFirestore();

      // Verify admin role
      const userDoc = await db.doc(`usuarios/${token.uid}`).get();
      if (!userDoc.exists || userDoc.data().rol !== 'admin') {
        res.status(403).json({ error: 'Solo administradores pueden generar lecciones' });
        return;
      }

      // Read OpenAI config from Firestore
      const configDoc = await db.doc('configuracion/openai').get();
      if (!configDoc.exists || !configDoc.data().apiKey) {
        res.status(400).json({ error: 'API Key de OpenAI no configurada.' });
        return;
      }
      const { apiKey, model: aiModel } = configDoc.data();

      const { temaId, temaName, context = '' } = req.body;
      if (!temaId || !temaName) {
        res.status(400).json({ error: 'temaId y temaName son requeridos' });
        return;
      }

      const prompt = `Crea una leccion educativa completa y bien estructurada sobre el tema "${temaName}"${context ? ` (materia: ${context})` : ''} para estudiantes que se preparan para un examen de admision universitario en Mexico.

La leccion debe:
- Cubrir todos los conceptos clave del tema
- Usar explicaciones claras con ejemplos concretos
- Incluir datos, formulas o reglas importantes cuando aplique
- Ser concisa pero completa (entre 800 y 1500 palabras)

Responde UNICAMENTE con HTML valido usando estas etiquetas:
- <h2> para el titulo principal
- <h3> para subtemas
- <h4> para sub-secciones
- <p> para parrafos
- <ul>/<ol> y <li> para listas
- <strong> para conceptos clave
- <em> para enfasis
- <blockquote> para datos importantes o tips
- <table>, <thead>, <tbody>, <tr>, <th>, <td> para tablas comparativas si aplica

NO uses <html>, <head>, <body>, <style>, <script>, ni clases CSS. Solo el contenido HTML directo.
NO incluyas bloques de codigo markdown. Solo HTML puro.`;

      const openaiRes = await openaiRequest(apiKey, aiModel || 'gpt-4.1-mini', [
        {
          role: 'system',
          content: 'Eres un profesor experto en preparacion para examenes de admision universitario en Mexico. Creas lecciones educativas claras, estructuradas y faciles de entender. Respondes solo con HTML valido.',
        },
        { role: 'user', content: prompt },
      ]);

      let html = openaiRes.choices[0].message.content.trim();
      // Strip markdown code fences if present
      html = html.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?\s*```$/, '');

      // Save to tema document
      await db.doc(`temas/${temaId}`).update({ leccion_html: html });

      res.json({ success: true, length: html.length });
    } catch (error) {
      console.error('Generate lesson error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },
);

/**
 * Import questions via API key (callable from curl / CLI).
 *
 * POST body:
 *   {
 *     "key": "<admin import key stored in configuracion/import_key>",
 *     "preguntas": [ { texto, opciones, dificultad, materia_id, tema_id, ... } ]
 *   }
 *
 * Setup: create a Firestore doc  configuracion/import_key  with field  key: "your-secret"
 *
 * Example curl:
 *   curl -X POST <FUNCTION_URL>/importPreguntas \
 *     -H "Content-Type: application/json" \
 *     -d '{"key":"your-secret","preguntas":[{...}]}'
 */
exports.importPreguntas = onRequest(
  { cors: true, timeoutSeconds: 120, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { key, preguntas } = req.body;
    if (!key) {
      res.status(401).json({ error: 'Missing key' });
      return;
    }

    const db = getFirestore();

    // Validate import key from Firestore
    const keyDoc = await db.doc('configuracion/import_key').get();
    if (!keyDoc.exists || keyDoc.data().key !== key) {
      res.status(403).json({ error: 'Invalid key' });
      return;
    }

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      res.status(400).json({ error: 'preguntas must be a non-empty array' });
      return;
    }

    if (preguntas.length > 500) {
      res.status(400).json({ error: 'Max 500 preguntas per request' });
      return;
    }

    try {
      const col = db.collection('preguntas');
      let inserted = 0;
      const errors = [];

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < preguntas.length; i += batchSize) {
        const chunk = preguntas.slice(i, i + batchSize);
        const batch = db.batch();

        for (let j = 0; j < chunk.length; j++) {
          const p = chunk[j];

          // Validate required fields
          if (!p.texto || !Array.isArray(p.opciones) || p.opciones.length < 2) {
            errors.push({ index: i + j, error: 'Missing texto or opciones (min 2)' });
            continue;
          }

          const ref = col.doc();
          batch.set(ref, {
            texto: p.texto,
            opciones: p.opciones.map((o) => ({
              texto: o.texto || '',
              explicacion: o.explicacion || '',
              es_correcta: !!o.es_correcta,
            })),
            dificultad: p.dificultad || 2,
            tema_id: p.tema_id || '',
            materia_id: p.materia_id || '',
            imagen_url: p.imagen_url || null,
            imagen_descripcion: p.imagen_descripcion || null,
            tags: p.tags || [],
            stats: {
              veces_respondida: 0,
              veces_correcta: 0,
              ratio_acierto: 0,
              ratio_por_opcion: [0, 0, 0, 0],
            },
            creada_por: p.creada_por || 'import-api',
            revisada: !!p.revisada,
            fecha_creacion: FieldValue.serverTimestamp(),
          });
          inserted++;
        }

        await batch.commit();
      }

      res.json({ inserted, errors });
    } catch (error) {
      console.error('Import preguntas error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },
);
