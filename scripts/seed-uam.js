#!/usr/bin/env node

/**
 * Script de automatización para poblar todo el contenido de UAM en Firestore.
 *
 * Reutiliza materias y temas que ya existan (ej: de UNAM/IPN) y crea solo los nuevos.
 *
 * Fases:
 *   1. Crear materias (si no existen)
 *   2. Crear temas con subtemas (si no existen)
 *   3. Generar lecciones HTML vía OpenAI (si leccion_html es null)
 *   4. Generar 20 preguntas por tema vía OpenAI (si tiene < 20)
 *   5. Crear exámenes UAM y temas_config por división
 *
 * Uso:
 *   node scripts/seed-uam.js
 *   node scripts/seed-uam.js --skip-ai        # Solo crea estructura, no llama OpenAI
 *   node scripts/seed-uam.js --only-lessons    # Solo genera lecciones faltantes
 *   node scripts/seed-uam.js --only-questions  # Solo genera preguntas faltantes
 *
 * Auth (requerido para escritura en Firestore):
 *   FIREBASE_EMAIL=admin@email.com FIREBASE_PASSWORD=pass node scripts/seed-uam.js
 *   (o el script te pedirá las credenciales interactivamente)
 *
 * El progreso se guarda en scripts/progreso-uam.json para poder reiniciar.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { initializeApp } = require('firebase/app');
const {
  getAuth,
  signInWithEmailAndPassword,
} = require('firebase/auth');
const {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
} = require('firebase/firestore');

// ─── Firebase config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyBG3q34Nzp3JYw09eXwf5hjJvfKey6hHl4',
  authDomain: 'estudiarbarato.firebaseapp.com',
  projectId: 'estudiarbarato',
  storageBucket: 'estudiarbarato.firebasestorage.app',
  messagingSenderId: '94280676835',
  appId: '1:94280676835:web:dd383c20a9534f83685cd6',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Paths ────────────────────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, 'uam-data.json');
const PROGRESS_PATH = path.join(__dirname, 'progreso-uam.json');

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const SKIP_AI = args.includes('--skip-ai');
const ONLY_LESSONS = args.includes('--only-lessons');
const ONLY_QUESTIONS = args.includes('--only-questions');

// ─── Load data ────────────────────────────────────────────────────────────────
const schoolData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

// ─── Progress tracking ───────────────────────────────────────────────────────
function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  } catch {
    return {
      materias: {},       // { key: firestoreId }
      temas: {},          // { "materiaKey/temaKey": firestoreId }
      lessons_done: [],   // [ "materiaKey/temaKey", ... ]
      questions_done: [],  // [ "materiaKey/temaKey", ... ]
      examenes: {},       // { areaKey: firestoreId }
      temas_config_done: [], // [ "areaKey", ... ]
    };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// ─── OpenAI API (raw HTTPS) ─────────────────────────────────────────────────
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
            reject(new Error(`Invalid JSON from OpenAI: ${data.substring(0, 300)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(280000, () => {
      req.destroy();
      reject(new Error('OpenAI request timeout'));
    });
    req.write(body);
    req.end();
  });
}

/** Retry with exponential backoff */
async function openaiWithRetry(apiKey, model, messages, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openaiRequest(apiKey, model, messages);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`    ⚠ Intento ${attempt} falló: ${err.message}. Reintentando en ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Authentication ──────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function authenticate() {
  const auth = getAuth(app);

  const email = process.env.FIREBASE_EMAIL || await prompt('Email de admin: ');
  const password = process.env.FIREBASE_PASSWORD || await prompt('Contraseña: ');

  if (!email || !password) {
    throw new Error('Se necesitan credenciales. Usa env vars FIREBASE_EMAIL y FIREBASE_PASSWORD, o ingrésalas manualmente.');
  }

  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log(`  ✓ Autenticado como: ${cred.user.email}`);
  return cred.user;
}

// ─── Read OpenAI config from Firestore ───────────────────────────────────────
async function getOpenAIConfig() {
  const configRef = doc(db, 'configuracion', 'openai');
  const snap = await getDoc(configRef);
  if (!snap.exists() || !snap.data().apiKey) {
    throw new Error(
      'API Key de OpenAI no encontrada en Firestore (configuracion/openai). ' +
      'Configúrala desde el dashboard antes de correr el script.',
    );
  }
  return snap.data();
}

// ─── Phase 1: Create Materias ────────────────────────────────────────────────
async function phase1CreateMaterias(progress) {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FASE 1: Crear Materias');
  console.log('══════════════════════════════════════════════════\n');

  const materiasCol = collection(db, 'materias');
  const existingSnap = await getDocs(materiasCol);
  const existingMap = new Map();
  existingSnap.forEach((d) => {
    existingMap.set(d.data().nombre_canonical, d.id);
  });

  let created = 0;
  let skipped = 0;

  for (const materia of schoolData.materias) {
    // Already tracked in progress?
    if (progress.materias[materia.key]) {
      console.log(`  ✓ ${materia.nombre_canonical} (ya en progreso: ${progress.materias[materia.key]})`);
      skipped++;
      continue;
    }

    // Exists in Firestore by name? (reuse from UNAM/IPN or other schools)
    if (existingMap.has(materia.nombre_canonical)) {
      const existingId = existingMap.get(materia.nombre_canonical);
      progress.materias[materia.key] = existingId;
      saveProgress(progress);
      console.log(`  ✓ ${materia.nombre_canonical} (reutilizada: ${existingId})`);
      skipped++;
      continue;
    }

    // Create new
    const ref = await addDoc(materiasCol, {
      nombre_canonical: materia.nombre_canonical,
      sinonimos: [],
      icono: null,
      color: null,
      fecha_creacion: serverTimestamp(),
    });
    progress.materias[materia.key] = ref.id;
    saveProgress(progress);
    console.log(`  + ${materia.nombre_canonical} → ${ref.id}`);
    created++;
  }

  console.log(`\n  Resumen: ${created} creadas, ${skipped} reutilizadas/existentes\n`);
}

// ─── Phase 2: Create Temas ──────────────────────────────────────────────────
async function phase2CreateTemas(progress) {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FASE 2: Crear Temas');
  console.log('══════════════════════════════════════════════════\n');

  const temasCol = collection(db, 'temas');

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const materia of schoolData.materias) {
    const materiaId = progress.materias[materia.key];
    if (!materiaId) {
      console.error(`  ✗ No se encontró ID para materia "${materia.key}". ¿Se ejecutó la Fase 1?`);
      continue;
    }

    console.log(`  📘 ${materia.nombre_canonical} (${materiaId})`);

    // Query existing temas for this materia
    const q = query(temasCol, where('materia_id', '==', materiaId));
    const existingSnap = await getDocs(q);
    const existingByName = new Map();
    existingSnap.forEach((d) => {
      existingByName.set(d.data().nombre_canonical, d.id);
    });

    for (const tema of materia.temas) {
      const temaKey = `${materia.key}/${tema.key}`;

      // Already in progress?
      if (progress.temas[temaKey]) {
        console.log(`    ✓ ${tema.nombre_canonical} (${progress.temas[temaKey]})`);
        totalSkipped++;
        continue;
      }

      // Exists by name? (reuse from UNAM/IPN or other schools)
      if (existingByName.has(tema.nombre_canonical)) {
        const existingId = existingByName.get(tema.nombre_canonical);
        progress.temas[temaKey] = existingId;
        saveProgress(progress);
        console.log(`    ✓ ${tema.nombre_canonical} (reutilizado: ${existingId})`);
        totalSkipped++;
        continue;
      }

      // Create new
      const ref = await addDoc(temasCol, {
        nombre_canonical: tema.nombre_canonical,
        materia_id: materiaId,
        subtemas: tema.subtemas || [],
        tags: [],
        total_preguntas: 0,
        leccion_html: null,
        fecha_creacion: serverTimestamp(),
      });
      progress.temas[temaKey] = ref.id;
      saveProgress(progress);
      console.log(`    + ${tema.nombre_canonical} → ${ref.id}`);
      totalCreated++;
    }
  }

  console.log(`\n  Resumen: ${totalCreated} creados, ${totalSkipped} reutilizados/existentes\n`);
}

// ─── Phase 3: Generate Lessons ──────────────────────────────────────────────
async function phase3GenerateLessons(progress, openaiConfig) {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FASE 3: Generar Lecciones (OpenAI)');
  console.log('══════════════════════════════════════════════════\n');

  const { apiKey, model: aiModel } = openaiConfig;
  const allTemas = [];

  for (const materia of schoolData.materias) {
    for (const tema of materia.temas) {
      const temaKey = `${materia.key}/${tema.key}`;
      const temaId = progress.temas[temaKey];
      if (!temaId) continue;
      allTemas.push({ materia, tema, temaKey, temaId });
    }
  }

  // Filter out already done
  const pending = [];
  for (const item of allTemas) {
    if (progress.lessons_done.includes(item.temaKey)) continue;

    // Also check Firestore in case leccion_html was set outside the script
    const temaDoc = await getDoc(doc(db, 'temas', item.temaId));
    if (temaDoc.exists() && temaDoc.data().leccion_html) {
      progress.lessons_done.push(item.temaKey);
      saveProgress(progress);
      continue;
    }
    pending.push(item);
  }

  console.log(`  Pendientes: ${pending.length} / ${allTemas.length} temas\n`);

  for (let i = 0; i < pending.length; i++) {
    const { materia, tema, temaKey, temaId } = pending[i];
    const subtemas = tema.subtemas || [];

    // Determine if this is an aptitude or knowledge topic
    const isAptitude = materia.key === 'razonamiento_verbal' || materia.key === 'razonamiento_matematico';

    console.log(`  [${i + 1}/${pending.length}] Generando lección: ${tema.nombre_canonical} (${materia.nombre_canonical})...`);

    const subtemasText = subtemas.length > 0
      ? `\n\nLos subtemas que DEBE cubrir la leccion son:\n${subtemas.map((s, j) => `${j + 1}. ${s}`).join('\n')}\n\nAsegurate de dedicar una seccion (con su propio <h3>) a cada subtema listado.`
      : '';

    const aptitudeNote = isAptitude
      ? '\n\nIMPORTANTE: Este es un tema de RAZONAMIENTO/APTITUD (no de conocimiento). La leccion debe enfocarse en ESTRATEGIAS y TECNICAS para resolver este tipo de ejercicios, con EJEMPLOS RESUELTOS paso a paso. Incluye tips practicos para el examen.'
      : '';

    const promptText = `Crea una leccion educativa completa y bien estructurada sobre el tema "${tema.nombre_canonical}" (materia: ${materia.nombre_canonical}) para estudiantes que se preparan para el examen de admision a la UAM (Universidad Autonoma Metropolitana) en Mexico.${subtemasText}${aptitudeNote}

La leccion debe:
- Cubrir todos los conceptos clave del tema${subtemas.length > 0 ? ' siguiendo los subtemas indicados' : ''}
- Usar explicaciones claras con ejemplos concretos
- Incluir datos, formulas o reglas importantes cuando aplique
- Ser concisa pero completa (entre ${subtemas.length > 5 ? '1500 y 3000' : '800 y 1500'} palabras)

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

    try {
      const res = await openaiWithRetry(apiKey, aiModel || 'gpt-4o-mini', [
        {
          role: 'system',
          content: 'Eres un profesor experto en preparacion para el examen de admision a la UAM. Creas lecciones educativas claras, estructuradas y faciles de entender. Respondes solo con HTML valido.',
        },
        { role: 'user', content: promptText },
      ]);

      let html = res.choices[0].message.content.trim();
      html = html.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?\s*```$/, '');

      await updateDoc(doc(db, 'temas', temaId), { leccion_html: html });

      progress.lessons_done.push(temaKey);
      saveProgress(progress);
      console.log(`    ✓ Lección guardada (${html.length} chars)`);
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
      console.error('    Continuando con el siguiente tema...');
    }

    // Rate limit: wait between calls
    if (i < pending.length - 1) {
      await sleep(2000);
    }
  }

  console.log(`\n  Fase 3 completa.\n`);
}

// ─── Phase 4: Generate Questions ────────────────────────────────────────────
async function phase4GenerateQuestions(progress, openaiConfig) {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FASE 4: Generar Preguntas (OpenAI)');
  console.log('══════════════════════════════════════════════════\n');

  const { apiKey, model: aiModel } = openaiConfig;
  const preguntasCol = collection(db, 'preguntas');
  const allTemas = [];

  for (const materia of schoolData.materias) {
    for (const tema of materia.temas) {
      const temaKey = `${materia.key}/${tema.key}`;
      const temaId = progress.temas[temaKey];
      const materiaId = progress.materias[materia.key];
      if (!temaId || !materiaId) continue;
      allTemas.push({ materia, tema, temaKey, temaId, materiaId });
    }
  }

  // Filter out already done
  const pending = [];
  for (const item of allTemas) {
    if (progress.questions_done.includes(item.temaKey)) continue;

    // Check if the tema already has >= 20 questions
    const q = query(preguntasCol, where('tema_id', '==', item.temaId));
    const snap = await getDocs(q);
    if (snap.size >= 20) {
      progress.questions_done.push(item.temaKey);
      saveProgress(progress);
      continue;
    }

    // Calculate how many more we need
    item.existingCount = snap.size;
    item.needed = 20 - snap.size;
    pending.push(item);
  }

  console.log(`  Pendientes: ${pending.length} / ${allTemas.length} temas\n`);

  for (let i = 0; i < pending.length; i++) {
    const { materia, tema, temaKey, temaId, materiaId, needed } = pending[i];
    const subtemas = tema.subtemas || [];

    // Determine if this is an aptitude or knowledge topic
    const isAptitude = materia.key === 'razonamiento_verbal' || materia.key === 'razonamiento_matematico';

    console.log(`  [${i + 1}/${pending.length}] Generando ${needed} preguntas: ${tema.nombre_canonical} (${materia.nombre_canonical})...`);

    const subtemasText = subtemas.length > 0
      ? `\n\nLos subtemas que deben cubrirse son:\n${subtemas.map((s, j) => `${j + 1}. ${s}`).join('\n')}\n\nDistribuye las preguntas de manera equilibrada entre todos los subtemas.`
      : '';

    const aptitudeNote = isAptitude
      ? '\n\nIMPORTANTE: Estas son preguntas de RAZONAMIENTO/APTITUD, no de conocimiento memorístico. Deben evaluar la capacidad de analisis, logica y resolucion de problemas del estudiante. Incluye ejercicios con series, analogias, interpretacion de datos o comprension de textos segun aplique.'
      : '';

    const promptText = `Genera exactamente ${needed} preguntas de opcion multiple para el examen de admision a la UAM (Universidad Autonoma Metropolitana) sobre el tema "${tema.nombre_canonical}" (materia: ${materia.nombre_canonical}).${subtemasText}${aptitudeNote}

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

    try {
      const res = await openaiWithRetry(apiKey, aiModel || 'gpt-4o-mini', [
        {
          role: 'system',
          content: 'Eres un experto en crear preguntas para el examen de admision a la UAM. Genera preguntas precisas, variadas en dificultad, y con explicaciones educativas. Responde solo con JSON valido.',
        },
        { role: 'user', content: promptText },
      ]);

      let content = res.choices[0].message.content.trim();
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');

      let questions;
      try {
        questions = JSON.parse(content);
        if (!Array.isArray(questions)) throw new Error('Not an array');
      } catch (e) {
        console.error(`    ✗ Error parseando JSON: ${e.message}`);
        console.error(`    Raw (primeros 200 chars): ${content.substring(0, 200)}`);
        continue;
      }

      // Save questions in batch
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const q of questions) {
        const ref = doc(collection(db, 'preguntas'));
        batch.set(ref, {
          texto: q.texto,
          opciones: (q.opciones || []).map((o) => ({
            texto: o.texto || '',
            explicacion: o.explicacion || '',
            es_correcta: !!o.es_correcta,
          })),
          dificultad: q.dificultad || 2,
          tema_id: temaId,
          materia_id: materiaId,
          imagen_url: null,
          imagen_descripcion: null,
          tags: q.tags || [],
          stats: {
            veces_respondida: 0,
            veces_correcta: 0,
            ratio_acierto: 0,
            ratio_por_opcion: [0, 0, 0, 0],
          },
          creada_por: 'seed-uam',
          revisada: false,
          fecha_creacion: serverTimestamp(),
        });
        batchCount++;
      }

      await batch.commit();

      // Update total_preguntas on tema
      const temaDoc = await getDoc(doc(db, 'temas', temaId));
      const currentTotal = temaDoc.exists() ? (temaDoc.data().total_preguntas || 0) : 0;
      await updateDoc(doc(db, 'temas', temaId), {
        total_preguntas: currentTotal + batchCount,
      });

      progress.questions_done.push(temaKey);
      saveProgress(progress);
      console.log(`    ✓ ${batchCount} preguntas guardadas`);
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
      console.error('    Continuando con el siguiente tema...');
    }

    // Rate limit: wait between calls
    if (i < pending.length - 1) {
      await sleep(3000);
    }
  }

  console.log(`\n  Fase 4 completa.\n`);
}

// ─── Phase 5: Create Examenes + temas_config ────────────────────────────────
async function phase5CreateExamenes(progress) {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FASE 5: Crear Exámenes UAM y temas_config');
  console.log('══════════════════════════════════════════════════\n');

  const examenesCol = collection(db, 'examenes');

  // Check existing UAM exams
  const q = query(examenesCol, where('escuela', '==', 'UAM'));
  const existingSnap = await getDocs(q);
  const existingByArea = new Map();
  existingSnap.forEach((d) => {
    existingByArea.set(d.data().area, d.id);
  });

  for (const areaConfig of schoolData.areas) {
    console.log(`\n  📋 ${areaConfig.area}`);

    // Check if exam already exists
    let examenId = progress.examenes[areaConfig.key];

    if (!examenId && existingByArea.has(areaConfig.area)) {
      examenId = existingByArea.get(areaConfig.area);
      progress.examenes[areaConfig.key] = examenId;
      saveProgress(progress);
      console.log(`    Examen ya existe: ${examenId}`);
    }

    if (!examenId) {
      // Create exam
      const ref = await addDoc(examenesCol, {
        escuela: 'UAM',
        escuela_orden: areaConfig.escuela_orden,
        nombre: areaConfig.nombre,
        area: areaConfig.area,
        año: 2025,
        orden: areaConfig.orden,
        total_reactivos: areaConfig.total_reactivos,
        tiempo_limite_minutos: areaConfig.tiempo_limite_minutos,
        fecha_creacion: serverTimestamp(),
      });
      examenId = ref.id;
      progress.examenes[areaConfig.key] = examenId;
      saveProgress(progress);
      console.log(`    + Examen creado: ${examenId}`);
    }

    // Check if temas_config already done
    if (progress.temas_config_done.includes(areaConfig.key)) {
      console.log('    temas_config ya configurado, saltando...');
      continue;
    }

    // Check if temas_config already has entries
    const configCol = collection(db, 'examenes', examenId, 'temas_config');
    const configSnap = await getDocs(configCol);
    if (configSnap.size > 0) {
      console.log(`    temas_config ya tiene ${configSnap.size} entradas, saltando...`);
      progress.temas_config_done.push(areaConfig.key);
      saveProgress(progress);
      continue;
    }

    // Create temas_config entries
    let orden = 1;
    let totalConfigured = 0;

    const materiaKeys = Object.keys(areaConfig.distribucion);

    for (const materiaKey of materiaKeys) {
      const materia = schoolData.materias.find((m) => m.key === materiaKey);
      if (!materia) {
        console.error(`    ✗ Materia key "${materiaKey}" no encontrada en datos`);
        continue;
      }

      const numReactivosMateria = areaConfig.distribucion[materiaKey];
      const temasCount = materia.temas.length;
      const baseReactivos = Math.floor(numReactivosMateria / temasCount);
      let remainder = numReactivosMateria % temasCount;

      console.log(`    📘 ${materia.nombre_canonical}: ${numReactivosMateria} reactivos / ${temasCount} temas`);

      for (const tema of materia.temas) {
        const temaKey = `${materia.key}/${tema.key}`;
        const temaId = progress.temas[temaKey];

        if (!temaId) {
          console.error(`      ✗ No se encontró ID para tema "${temaKey}"`);
          continue;
        }

        const numReactivos = baseReactivos + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        await addDoc(configCol, {
          tema_id: temaId,
          nombre_mostrar: tema.nombre_canonical,
          seccion: materia.nombre_canonical,
          orden: orden++,
          num_reactivos: numReactivos,
          dificultades: [1, 2, 3],
        });
        totalConfigured++;
      }
    }

    progress.temas_config_done.push(areaConfig.key);
    saveProgress(progress);
    console.log(`    ✓ ${totalConfigured} temas_config creados`);
  }

  console.log(`\n  Fase 5 completa.\n`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Seed UAM - Automatización de contenido         ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (SKIP_AI) console.log('\n⚡ Modo --skip-ai: No se llamará a OpenAI\n');
  if (ONLY_LESSONS) console.log('\n⚡ Modo --only-lessons: Solo lecciones\n');
  if (ONLY_QUESTIONS) console.log('\n⚡ Modo --only-questions: Solo preguntas\n');

  // Authenticate first
  console.log('\n🔐 Autenticación requerida (las reglas de Firestore requieren auth para escritura)');
  console.log('   Puedes usar env vars: FIREBASE_EMAIL y FIREBASE_PASSWORD\n');
  await authenticate();

  const progress = loadProgress();

  // Count total work
  let totalTemas = 0;
  for (const m of schoolData.materias) totalTemas += m.temas.length;
  console.log(`\nDatos: ${schoolData.materias.length} materias, ${totalTemas} temas, ${schoolData.areas.length} divisiones`);
  console.log(`Progreso previo: ${Object.keys(progress.materias).length} materias, ${Object.keys(progress.temas).length} temas, ${progress.lessons_done.length} lecciones, ${progress.questions_done.length} preguntas\n`);

  // Phases 1 & 2: Structure (always run unless --only-*)
  if (!ONLY_LESSONS && !ONLY_QUESTIONS) {
    await phase1CreateMaterias(progress);
    await phase2CreateTemas(progress);
  }

  // Phases 3 & 4: AI content
  if (!SKIP_AI) {
    let openaiConfig;
    try {
      openaiConfig = await getOpenAIConfig();
      console.log(`  OpenAI modelo: ${openaiConfig.model || 'gpt-4o-mini'}`);
    } catch (err) {
      console.error(`\n✗ ${err.message}`);
      console.log('  Puedes correr las fases 1-2 y 5 con: node scripts/seed-uam.js --skip-ai');
      process.exit(1);
    }

    if (!ONLY_QUESTIONS) {
      await phase3GenerateLessons(progress, openaiConfig);
    }
    if (!ONLY_LESSONS) {
      await phase4GenerateQuestions(progress, openaiConfig);
    }
  }

  // Phase 5: Exams (always run unless --only-*)
  if (!ONLY_LESSONS && !ONLY_QUESTIONS) {
    await phase5CreateExamenes(progress);
  }

  // Final summary
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   ¡Proceso UAM completado!                       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Materias:     ${String(Object.keys(progress.materias).length).padStart(3)} / ${schoolData.materias.length}                       ║`);
  console.log(`║  Temas:        ${String(Object.keys(progress.temas).length).padStart(3)} / ${totalTemas}                      ║`);
  console.log(`║  Lecciones:    ${String(progress.lessons_done.length).padStart(3)} / ${totalTemas}                      ║`);
  console.log(`║  Preguntas:    ${String(progress.questions_done.length).padStart(3)} / ${totalTemas}                      ║`);
  console.log(`║  Exámenes:     ${String(Object.keys(progress.examenes).length).padStart(3)} / ${schoolData.areas.length}                        ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Error fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
