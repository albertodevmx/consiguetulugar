#!/usr/bin/env node

/**
 * Script para importar preguntas por lote a Firestore.
 *
 * Uso:
 *   node scripts/import-questions.js <archivo.json>
 *
 * El JSON debe ser un array de objetos con la estructura:
 * [
 *   {
 *     "text": "Texto de la pregunta",
 *     "topicId": "<id>",
 *     "options": ["Opcion A", "Opcion B", "Opcion C", "Opcion D"],
 *     "correctOption": 0,
 *     "imageUrl": ""  // opcional
 *   }
 * ]
 *
 * Requisitos:
 *   npm install firebase (ya incluido en el proyecto)
 *
 * Notas:
 *   - Firestore tiene un limite de 500 operaciones por batch.
 *   - Este script divide el array en lotes de 500 automaticamente.
 *   - Valida que cada pregunta tenga los campos obligatorios.
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: 'AIzaSyB3Cbzk0mmao6SaCLuhdiDc0GRsD9ql7BU',
  authDomain: 'consiguetulugar.firebaseapp.com',
  projectId: 'consiguetulugar',
  storageBucket: 'consiguetulugar.firebasestorage.app',
  messagingSenderId: '540106876976',
  appId: '1:540106876976:web:d77f785eb73c4cdc9325f5',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BATCH_LIMIT = 500;

function validate(question, index) {
  const required = ['text', 'topicId', 'options', 'correctOption'];
  for (const field of required) {
    if (question[field] == null) {
      throw new Error(`Pregunta [${index}]: falta campo "${field}".`);
    }
  }
  if (!Array.isArray(question.options) || question.options.length < 3) {
    throw new Error(`Pregunta [${index}]: debe tener al menos 3 opciones.`);
  }
  if (question.correctOption < 0 || question.correctOption >= question.options.length) {
    throw new Error(
      `Pregunta [${index}]: correctOption (${question.correctOption}) fuera de rango.`,
    );
  }
}

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/import-questions.js <archivo.json>');
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Archivo no encontrado: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const questions = JSON.parse(raw);

  if (!Array.isArray(questions)) {
    console.error('El JSON debe ser un array de preguntas.');
    process.exit(1);
  }

  console.log(`Validando ${questions.length} preguntas...`);
  questions.forEach((q, i) => validate(q, i));
  console.log('Validacion correcta.');

  // Verificar que los topicIds referenciados existen
  const uniqueTopics = [...new Set(questions.map((q) => q.topicId))];

  console.log('Verificando topicIds en Firestore...');
  for (const id of uniqueTopics) {
    const snap = await getDoc(doc(db, 'topics', id));
    if (!snap.exists()) console.warn(`ADVERTENCIA: topicId "${id}" no existe en Firestore.`);
  }

  // Import in batches
  const colRef = collection(db, 'questions');
  let imported = 0;

  for (let i = 0; i < questions.length; i += BATCH_LIMIT) {
    const chunk = questions.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const q of chunk) {
      const ref = doc(colRef);
      batch.set(ref, {
        text: q.text,
        topicId: q.topicId,
        options: q.options.map((o) => (typeof o === 'string' ? { text: o } : o)),
        correctOption: q.correctOption,
        imageUrl: q.imageUrl || null,
        active: true,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    imported += chunk.length;
    console.log(`  Lote importado: ${imported}/${questions.length}`);
  }

  console.log(`Importacion completa. ${imported} preguntas creadas.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
