#!/usr/bin/env node

/**
 * Script de reparación para poblar temas_config en exámenes que no los tienen.
 *
 * Problema: Los exámenes fueron creados pero la subcolección temas_config quedó vacía.
 * Solución: Buscar los temas existentes por nombre_canonical y crear temas_config.
 *
 * Uso:
 *   FIREBASE_EMAIL=admin@email.com FIREBASE_PASSWORD=pass node scripts/repair-temas-config.js
 *   node scripts/repair-temas-config.js --dry-run   # Solo muestra qué haría sin escribir
 *
 * Soporta: UNAM, IPN, UAM (detecta escuela automáticamente por los exámenes existentes)
 */

const fs = require('fs');
const path = require('path');
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
  addDoc,
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
const auth = getAuth(app);

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Data files ───────────────────────────────────────────────────────────────

function loadDataFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const unamData = loadDataFile('unam-data.json');
const ipnData = loadDataFile('ipn-data.json');
const uamData = loadDataFile('uam-data.json');

// Map escuela -> data
const escuelaDataMap = {};
if (unamData) escuelaDataMap['UNAM'] = unamData;
if (ipnData) escuelaDataMap['IPN'] = ipnData;
if (uamData) escuelaDataMap['UAM'] = uamData;

// ─── Auth ─────────────────────────────────────────────────────────────────────

function askQuestion(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (ans) => { rl.close(); resolve(ans); }));
}

async function authenticate() {
  const email = process.env.FIREBASE_EMAIL || await askQuestion('Email: ');
  const password = process.env.FIREBASE_PASSWORD || await askQuestion('Password: ');
  await signInWithEmailAndPassword(auth, email, password);
  console.log('✓ Autenticado\n');
}

// ─── Main logic ───────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Reparar temas_config en exámenes               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (DRY_RUN) console.log('⚡ Modo --dry-run: No se escribirá nada\n');

  if (!DRY_RUN) {
    await authenticate();
  }

  // Step 1: Load all temas from Firestore, indexed by nombre_canonical
  console.log('📚 Cargando temas de Firestore...');
  const temasSnap = await getDocs(collection(db, 'temas'));
  const temasByName = new Map();
  temasSnap.forEach((d) => {
    const data = d.data();
    temasByName.set(data.nombre_canonical, { id: d.id, ...data });
  });
  console.log(`   ${temasByName.size} temas encontrados\n`);

  // Step 2: Load all materias from Firestore, indexed by nombre_canonical
  console.log('📘 Cargando materias de Firestore...');
  const materiasSnap = await getDocs(collection(db, 'materias'));
  const materiasByName = new Map();
  materiasSnap.forEach((d) => {
    const data = d.data();
    materiasByName.set(data.nombre_canonical, { id: d.id, ...data });
  });
  console.log(`   ${materiasByName.size} materias encontradas\n`);

  // Step 3: Load all exámenes from Firestore
  console.log('📋 Cargando exámenes de Firestore...');
  const examenesSnap = await getDocs(collection(db, 'examenes'));
  const examenes = [];
  examenesSnap.forEach((d) => {
    examenes.push({ id: d.id, ...d.data() });
  });
  console.log(`   ${examenes.length} exámenes encontrados\n`);

  // Step 4: For each exam, check if temas_config is empty and populate it
  let totalRepaired = 0;
  let totalSkipped = 0;

  for (const examen of examenes) {
    console.log(`\n══ ${examen.escuela} – ${examen.nombre} (${examen.id})`);

    // Check existing temas_config
    const configCol = collection(db, 'examenes', examen.id, 'temas_config');
    const configSnap = await getDocs(configCol);

    if (configSnap.size > 0) {
      console.log(`   ✓ Ya tiene ${configSnap.size} temas_config, saltando.`);
      totalSkipped++;
      continue;
    }

    // Find the matching data file for this escuela
    const escuelaData = escuelaDataMap[examen.escuela];
    if (!escuelaData) {
      console.log(`   ✗ No hay archivo de datos para escuela "${examen.escuela}", saltando.`);
      totalSkipped++;
      continue;
    }

    // Find the matching area config
    const areaConfig = escuelaData.areas.find((a) =>
      a.area === examen.area || a.nombre === examen.nombre
    );
    if (!areaConfig) {
      console.log(`   ✗ No se encontró configuración de área para "${examen.area}", saltando.`);
      totalSkipped++;
      continue;
    }

    console.log(`   Distribución: ${JSON.stringify(areaConfig.distribucion)}`);

    // Create temas_config entries
    let orden = 1;
    let configsCreated = 0;

    const materiaKeys = Object.keys(areaConfig.distribucion);

    for (const materiaKey of materiaKeys) {
      const materia = escuelaData.materias.find((m) => m.key === materiaKey);
      if (!materia) {
        console.log(`   ⚠ Materia key "${materiaKey}" no encontrada en datos JSON`);
        continue;
      }

      const numReactivosMateria = areaConfig.distribucion[materiaKey];
      const temasCount = materia.temas.length;
      const baseReactivos = Math.floor(numReactivosMateria / temasCount);
      let remainder = numReactivosMateria % temasCount;

      console.log(`   📘 ${materia.nombre_canonical}: ${numReactivosMateria} reactivos / ${temasCount} temas`);

      for (const tema of materia.temas) {
        // Find the tema in Firestore by nombre_canonical
        const firestoreTema = temasByName.get(tema.nombre_canonical);
        if (!firestoreTema) {
          console.log(`      ✗ Tema "${tema.nombre_canonical}" no encontrado en Firestore`);
          continue;
        }

        const numReactivos = baseReactivos + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        const configData = {
          tema_id: firestoreTema.id,
          nombre_mostrar: tema.nombre_canonical,
          seccion: materia.nombre_canonical,
          orden: orden++,
          num_reactivos: numReactivos,
          dificultades: [1, 2, 3],
        };

        if (DRY_RUN) {
          console.log(`      [DRY] Crearía temas_config: ${tema.nombre_canonical} → ${numReactivos} reactivos`);
        } else {
          await addDoc(configCol, configData);
          console.log(`      + ${tema.nombre_canonical} → ${numReactivos} reactivos`);
        }
        configsCreated++;
      }
    }

    console.log(`   ✓ ${configsCreated} temas_config ${DRY_RUN ? 'se crearían' : 'creados'}`);
    totalRepaired++;
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Resumen:`);
  console.log(`    Reparados: ${totalRepaired}`);
  console.log(`    Ya tenían config: ${totalSkipped}`);
  console.log('══════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
