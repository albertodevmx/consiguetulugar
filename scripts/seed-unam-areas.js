#!/usr/bin/env node

/**
 * Script para crear las áreas faltantes de UNAM en Firestore.
 *
 * Lee el examen existente de Área 3 y clona su estructura (materias_mapping)
 * para las Áreas 1, 2 y 4, ajustando la distribución de reactivos.
 *
 * Uso:
 *   node scripts/seed-unam-areas.js
 *
 * Requisitos:
 *   - El examen de Área 3 ya debe existir en la colección `examenes/`
 *   - npm install (firebase ya incluido en el proyecto)
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
} = require('firebase/firestore');

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

/**
 * Distribución oficial de reactivos UNAM por área (120 total cada una).
 * Fuente: Guía de estudio UNAM 2025.
 *
 * Las 9 materias son las mismas para todas las áreas,
 * lo que cambia es cuántos reactivos tiene cada una.
 */
const AREAS = {
  1: {
    nombre: 'Licenciatura Ciencias Fisico-Matematicas e Ingenierias 2025',
    area: 'Area 1 - Fisico-Matematicas e Ingenierias',
    distribucion: {
      'Español': 18,
      'Matemáticas': 26,
      'Física': 16,
      'Química': 10,
      'Biología': 10,
      'Historia Universal': 10,
      'Historia de México': 10,
      'Literatura': 10,
      'Geografía': 10,
    },
  },
  2: {
    nombre: 'Licenciatura Ciencias Biologicas y de la Salud 2025',
    area: 'Area 2 - Ciencias Biologicas y de la Salud',
    distribucion: {
      'Español': 18,
      'Matemáticas': 22,
      'Física': 12,
      'Química': 12,
      'Biología': 16,
      'Historia Universal': 10,
      'Historia de México': 10,
      'Literatura': 10,
      'Geografía': 10,
    },
  },
  4: {
    nombre: 'Licenciatura Humanidades y las Artes 2025',
    area: 'Area 4 - Humanidades y las Artes',
    distribucion: {
      'Español': 18,
      'Matemáticas': 22,
      'Física': 10,
      'Química': 10,
      'Biología': 10,
      'Historia Universal': 10,
      'Historia de México': 10,
      'Literatura': 20,
      'Geografía': 10,
    },
  },
};

async function main() {
  console.log('Buscando examen UNAM Area 3...\n');

  // 1. Find existing Area 3 exam
  const examenesRef = collection(db, 'examenes');
  const q = query(examenesRef, where('escuela', '==', 'UNAM'));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.error('No se encontró ningún examen UNAM. Asegúrate de tener al menos uno.');
    process.exit(1);
  }

  // Find the Area 3 exam
  let area3Doc = null;
  const existingAreas = [];
  snap.forEach((d) => {
    const data = d.data();
    existingAreas.push(data.area);
    if (data.area && data.area.includes('3')) {
      area3Doc = { id: d.id, ...data };
    }
  });

  if (!area3Doc) {
    console.error('No se encontró el examen de Área 3.');
    console.log('Exámenes encontrados:', existingAreas);
    process.exit(1);
  }

  console.log(`Encontrado: "${area3Doc.nombre}" (${area3Doc.area})`);
  console.log(`ID: ${area3Doc.id}`);
  console.log(`Total reactivos: ${area3Doc.total_reactivos}`);
  console.log(`Distribución:`, area3Doc.distribucion);

  // 2. Read materias_mapping from Area 3
  const mappingRef = collection(db, 'examenes', area3Doc.id, 'materias_mapping');
  const mappingSnap = await getDocs(mappingRef);
  const materiasMappings = [];
  mappingSnap.forEach((d) => {
    materiasMappings.push(d.data());
  });

  console.log(`\nMaterias mapping encontradas: ${materiasMappings.length}`);
  for (const m of materiasMappings) {
    console.log(`  - ${m.nombre_en_guia}: ${m.num_reactivos} reactivos, ${m.temas_mapping?.length || 0} temas`);
  }

  // 3. Check which areas already exist
  const existingAreaNumbers = existingAreas.map((a) => {
    const match = a.match(/(\d)/);
    return match ? parseInt(match[1]) : null;
  }).filter(Boolean);

  console.log(`\nÁreas existentes: ${existingAreaNumbers.join(', ')}`);

  // 4. Create missing areas
  for (const [areaNum, areaConfig] of Object.entries(AREAS)) {
    if (existingAreaNumbers.includes(parseInt(areaNum))) {
      console.log(`\nÁrea ${areaNum} ya existe, saltando...`);
      continue;
    }

    console.log(`\n--- Creando Área ${areaNum}: ${areaConfig.area} ---`);

    // Create exam document
    const examData = {
      escuela: 'UNAM',
      nombre: areaConfig.nombre,
      area: areaConfig.area,
      año: 2025,
      total_reactivos: 120,
      distribucion: areaConfig.distribucion,
      archivo_guia_url: null,
      fecha_creacion: serverTimestamp(),
    };

    const examRef = await addDoc(examenesRef, examData);
    console.log(`  Examen creado: ${examRef.id}`);

    // Create materias_mapping subcollection
    // Reuse the same materia_ids and temas from Area 3, but adjust num_reactivos
    let mappingsCreated = 0;
    for (const mapping of materiasMappings) {
      const nombreMateria = mapping.nombre_en_guia;

      // Find the matching num_reactivos for this area
      const numReactivos = findReactivos(areaConfig.distribucion, nombreMateria);

      const newMapping = {
        materia_id: mapping.materia_id,
        nombre_en_guia: mapping.nombre_en_guia,
        num_reactivos: numReactivos,
        temas_mapping: mapping.temas_mapping || [],
      };

      const mappingColRef = collection(db, 'examenes', examRef.id, 'materias_mapping');
      await addDoc(mappingColRef, newMapping);
      mappingsCreated++;
      console.log(`  + ${nombreMateria}: ${numReactivos} reactivos`);
    }

    console.log(`  Total mappings creados: ${mappingsCreated}`);
  }

  console.log('\n¡Listo! Áreas creadas exitosamente.');
  process.exit(0);
}

/**
 * Busca el número de reactivos para una materia en la distribución del área.
 * Hace matching flexible por nombre (ignora acentos, case-insensitive).
 */
function findReactivos(distribucion, nombreMateria) {
  // Direct match first
  if (distribucion[nombreMateria] != null) {
    return distribucion[nombreMateria];
  }

  // Normalize for fuzzy matching
  const normalize = (s) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const normalizedNombre = normalize(nombreMateria);

  for (const [key, value] of Object.entries(distribucion)) {
    if (normalize(key) === normalizedNombre) {
      return value;
    }
    // Partial match
    if (normalizedNombre.includes(normalize(key)) || normalize(key).includes(normalizedNombre)) {
      return value;
    }
  }

  // Default: 10 if no match found
  console.warn(`    ⚠ No se encontró distribución para "${nombreMateria}", usando 10 por defecto`);
  return 10;
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
