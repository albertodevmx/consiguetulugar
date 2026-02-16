# Especificación Técnica: App EstudiarBarato
## Guía de adaptación del frontend a la nueva estructura Firestore

---

## 1. ESTRUCTURA COMPLETA DE FIRESTORE

### 1.1 Colección: `materias/` (Catálogo canónico de contenido)

```
materias/
  └── {materia_id}/                          ← ID autogenerado por Firestore
        ├── nombre_canonical: "Historia de México"
        ├── sinonimos: ["Historia de México", "Historia patria"]
        ├── icono: null | "url_icono"
        ├── color: null | "#FF5733"
        ├── fecha_creacion: Timestamp
        │
        └── temas/                            ← Subcolección
              └── {tema_id}/
                    ├── nombre_canonical: "El movimiento de Independencia de la Nueva España (1810-1821)"
                    ├── sinonimos: ["Independencia de México", "La Independencia"]
                    ├── orden: 2                ← Para mostrar en el orden de la guía
                    ├── materia_id: "ref_materia"
                    ├── fecha_creacion: Timestamp
                    │
                    └── subtemas/              ← Subcolección
                          └── {subtema_id}/
                                ├── nombre_canonical: "Causas y antecedentes de la Independencia"
                                ├── sinonimos: ["Causas y antecedentes"]
                                ├── orden: 1
                                ├── materia_id: "ref_materia"
                                ├── tema_id: "ref_tema"
                                ├── nivel_dificultad_promedio: 0
                                ├── total_preguntas: 30
                                └── fecha_creacion: Timestamp
```

### 1.2 Colección: `preguntas/` (Banco central de preguntas)

```
preguntas/
  └── {pregunta_id}/
        ├── texto: "¿Cuál fue la causa externa principal del movimiento de Independencia?"
        ├── opciones: [
        │     {
        │       "texto": "La invasión napoleónica a España",
        │       "explicacion": "¡Correcto! La invasión de Napoleón a España en 1808 provocó una crisis política que debilitó el control colonial. Fernando VII fue obligado a abdicar, lo que generó un vacío de poder que los criollos aprovecharon para buscar autonomía.",
        │       "es_correcta": true
        │     },
        │     {
        │       "texto": "La Revolución Industrial en Inglaterra",
        │       "explicacion": "Incorrecto. Aunque la Revolución Industrial transformó la economía mundial, no fue una causa directa del movimiento de Independencia de México. Las causas externas principales fueron la invasión napoleónica y las ideas de la Ilustración.",
        │       "es_correcta": false
        │     },
        │     {
        │       "texto": "La independencia de Brasil",
        │       "explicacion": "Incorrecto. La independencia de Brasil ocurrió en 1822, después del inicio del movimiento de Independencia de México (1810). No pudo haber sido causa de un evento anterior.",
        │       "es_correcta": false
        │     },
        │     {
        │       "texto": "La Guerra de los Cien Años",
        │       "explicacion": "Incorrecto. La Guerra de los Cien Años (1337-1453) fue un conflicto entre Francia e Inglaterra que ocurrió siglos antes. No tiene relación directa con la Independencia de México.",
        │       "es_correcta": false
        │     }
        │   ]
        ├── dificultad: 1 | 2 | 3            ← 1=fácil, 2=media, 3=difícil
        ├── materia_id: "abc123"              ← Referencia a materias/{id}
        ├── tema_id: "def456"                 ← Referencia a temas/{id}
        ├── subtema_id: "ghi789"              ← Referencia a subtemas/{id}
        ├── imagen_url: null | "https://storage.googleapis.com/..."
        ├── imagen_descripcion: null | "Mapa de las rutas de la campaña de Hidalgo"
        ├── tags: ["causas", "externa", "napoleón"]
        ├── stats: {
        │     veces_respondida: 0,
        │     veces_correcta: 0,
        │     ratio_acierto: 0,
        │     ratio_por_opcion: [0, 0, 0, 0]   ← Distribución de respuestas por opción
        │   }
        ├── creada_por: "auto_gpt" | "manual"
        ├── revisada: false
        └── fecha_creacion: Timestamp
```

### 1.3 Colección: `examenes/` (Vincula escuela → contenido)

```
examenes/
  └── {examen_id}/
        ├── escuela: "UNAM"
        ├── nombre: "Licenciatura Ciencias Sociales 2025"
        ├── area: "Área 3 - Ciencias Sociales"
        ├── año: 2025
        ├── total_reactivos: 120
        ├── distribucion: {
        │     "Español": 18,
        │     "Matemáticas": 24,
        │     "Física": 10,
        │     "Química": 10,
        │     "Biología": 10,
        │     "Historia Universal": 14,
        │     "Historia de México": 14,
        │     "Literatura": 10,
        │     "Geografía": 10
        │   }
        ├── archivo_guia_url: null | "https://..."
        ├── fecha_creacion: Timestamp
        │
        └── materias_mapping/                  ← Subcolección
              └── {mapping_id}/
                    ├── materia_id: "abc123"    ← Referencia al catálogo
                    ├── nombre_en_guia: "Historia de México"
                    ├── num_reactivos: 14
                    └── temas_mapping: [
                          { tema_id: "def456", nombre_en_guia: "La Nueva España (siglos XVI a XIX)" },
                          { tema_id: "ghi789", nombre_en_guia: "El movimiento de Independencia..." },
                          ...
                        ]
```

### 1.4 Colección: `usuarios/` (Progreso del alumno)

```
usuarios/
  └── {user_id}/
        ├── nombre: "Juan Pérez"
        ├── email: "juan@email.com"
        ├── examen_activo: "ref_examen_id"     ← Qué examen está estudiando
        ├── fecha_registro: Timestamp
        │
        ├── resumen_debilidades: {
        │     subtemas_debiles: [
        │       { subtema_id: "ref", materia_id: "ref", ratio: 0.20, nombre: "Termodinámica" },
        │       { subtema_id: "ref", materia_id: "ref", ratio: 0.35, nombre: "Ley de Ohm" },
        │       ...
        │     ],
        │     subtemas_sin_practicar: ["subtema_id_1", "subtema_id_2", ...],
        │     ultima_actualizacion: Timestamp
        │   }
        │
        ├── preguntas_dominadas: ["pregunta_id_1", "pregunta_id_2", ...]
        │
        ├── progreso_materias/                 ← Subcolección
        │     └── {materia_id}/
        │           ├── total_intentos: 340
        │           ├── aciertos: 210
        │           ├── ratio: 0.62
        │           ├── nivel_dominio: "intermedio"
        │           └── ultima_practica: Timestamp
        │
        ├── progreso_temas/                    ← Subcolección
        │     └── {tema_id}/
        │           ├── materia_id: "ref"
        │           ├── total_intentos: 85
        │           ├── aciertos: 60
        │           ├── ratio: 0.71
        │           ├── nivel_dominio: "avanzado"
        │           ├── racha_actual: 8
        │           ├── ultima_practica: Timestamp
        │           └── siguiente_repaso: Timestamp
        │
        ├── progreso_subtemas/                 ← Subcolección
        │     └── {subtema_id}/
        │           ├── tema_id: "ref"
        │           ├── materia_id: "ref"
        │           ├── total_intentos: 25
        │           ├── aciertos: 20
        │           ├── ratio: 0.80
        │           ├── nivel_dominio: "avanzado"
        │           ├── racha_actual: 12
        │           ├── ultima_practica: Timestamp
        │           └── siguiente_repaso: Timestamp
        │
        └── historial_respuestas/              ← Subcolección
              └── {respuesta_id}/
                    ├── pregunta_id: "ref"
                    ├── materia_id: "ref"
                    ├── tema_id: "ref"
                    ├── subtema_id: "ref"
                    ├── opcion_elegida: 0       ← Índice 0-3
                    ├── correcta: false
                    ├── tiempo_respuesta_seg: 23
                    └── fecha: Timestamp
```

---

## 2. FLUJO DE NAVEGACIÓN DEL FRONTEND

```
┌─────────────────────────────────────────────────────┐
│  PANTALLA 1: Seleccionar Escuela                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   UNAM   │  │   IPN    │  │   UAM    │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  Query: examenes/ → agrupar por campo "escuela"     │
│  (valores únicos de escuela)                        │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  PANTALLA 2: Seleccionar Tipo de Examen             │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │ Licenciatura Ciencias Sociales 2025       │      │
│  │ Área 3 · 120 reactivos                   │      │
│  └───────────────────────────────────────────┘      │
│  ┌───────────────────────────────────────────┐      │
│  │ Licenciatura Ciencias Biológicas 2025     │      │
│  │ Área 2 · 120 reactivos                   │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  Query: examenes/ WHERE escuela == "UNAM"           │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  PANTALLA 3: Materias del Examen                    │
│                                                     │
│  ┌────────────────────────┬──────┬────────┐         │
│  │ Español                │  18  │ ▶ 62%  │         │
│  ├────────────────────────┼──────┼────────┤         │
│  │ Matemáticas            │  24  │ ▶ 45%  │         │
│  ├────────────────────────┼──────┼────────┤         │
│  │ Física                 │  10  │ ▶ 30%  │         │
│  ├────────────────────────┼──────┼────────┤         │
│  │ Historia de México     │  14  │ ▶ 78%  │         │
│  └────────────────────────┴──────┴────────┘         │
│     nombre_en_guia      reactivos  progreso         │
│                                                     │
│  Query: examenes/{id}/materias_mapping/             │
│  + usuario progreso_materias/{materia_id}           │
│                                                     │
│  🎯 Click en materia → OPCIÓN:                      │
│     A) Ver temas (ir a Pantalla 4)                  │
│     B) Practicar TODA la materia (ir a Pantalla 6)  │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  PANTALLA 4: Temas (Unidades) de la Materia         │
│                                                     │
│  📚 Historia de México                              │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │ 1. La Nueva España (siglos XVI a XIX)     │ 85%  │
│  ├───────────────────────────────────────────┤      │
│  │ 2. Independencia (1810-1821)              │ 70%  │
│  ├───────────────────────────────────────────┤      │
│  │ 3. México independiente (1821-1854)       │ 60%  │
│  ├───────────────────────────────────────────┤      │
│  │ 4. La Reforma liberal (1854-1876)         │ 40%  │
│  ├───────────────────────────────────────────┤      │
│  │ 5. El Porfiriato (1876-1911)              │  0%  │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  Query: materias/{materia_id}/temas/                │
│         ORDER BY orden ASC                          │
│  + usuario progreso_temas/{tema_id}                 │
│                                                     │
│  🎯 Click en tema → OPCIÓN:                         │
│     A) Ver subtemas (ir a Pantalla 5)               │
│     B) Practicar TODO el tema (ir a Pantalla 6)     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  PANTALLA 5: Subtemas del Tema                      │
│                                                     │
│  📋 La Nueva España (siglos XVI a XIX)              │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │ 1. Mesoamérica y áreas culturales         │ 90%  │
│  ├───────────────────────────────────────────┤      │
│  │ 2. Conquista militar y espiritual         │ 80%  │
│  ├───────────────────────────────────────────┤      │
│  │ 3. Organización política                  │ 85%  │
│  ├───────────────────────────────────────────┤      │
│  │ 4. Estructura económica y social          │ 70%  │
│  ├───────────────────────────────────────────┤      │
│  │ 5. Las Reformas Borbónicas                │ 50%  │
│  ├───────────────────────────────────────────┤      │
│  │ 6. Las ciencias y las artes               │  0%  │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  Query: materias/{materia_id}/temas/{tema_id}/      │
│         subtemas/ ORDER BY orden ASC                │
│  + usuario progreso_subtemas/{subtema_id}           │
│                                                     │
│  🎯 Click en subtema → ir a Pantalla 6              │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  PANTALLA 6: Práctica de Preguntas                  │
│                                                     │
│  Pregunta 3 de 30                          ⏱ 00:45  │
│                                                     │
│  ┌───────────────────────────────────────────┐      │
│  │ ¿Cuál fue la causa externa principal      │      │
│  │ del movimiento de Independencia?          │      │
│  │                                           │      │
│  │ 🖼 [imagen si aplica]                     │      │
│  └───────────────────────────────────────────┘      │
│                                                     │
│  ○ A) La invasión napoleónica a España              │
│  ○ B) La Revolución Industrial en Inglaterra        │
│  ○ C) La independencia de Brasil                    │
│  ○ D) La Guerra de los Cien Años                    │
│                                                     │
│  [Verificar respuesta]                              │
│                                                     │
│  ── Después de responder ──                         │
│                                                     │
│  ✅ ¡Correcto!                                      │
│  La invasión de Napoleón a España en 1808 provocó   │
│  una crisis política que debilitó el control         │
│  colonial...                                        │
│                                                     │
│  [Siguiente pregunta →]                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. QUERIES DE FIRESTORE POR PANTALLA

### Pantalla 1: Escuelas
```javascript
// Obtener escuelas únicas
const snapshot = await db.collection("examenes").get();
const escuelas = [...new Set(snapshot.docs.map(doc => doc.data().escuela))];
// Resultado: ["UNAM", "IPN", "UAM"]
```

### Pantalla 2: Tipos de examen por escuela
```javascript
const snapshot = await db.collection("examenes")
  .where("escuela", "==", "UNAM")
  .get();
// Cada doc tiene: nombre, area, año, total_reactivos
```

### Pantalla 3: Materias del examen seleccionado
```javascript
// 1. Obtener mapping de materias para este examen
const mappingSnapshot = await db.collection("examenes")
  .doc(examenId)
  .collection("materias_mapping")
  .get();

// 2. Para cada materia, obtener progreso del usuario
for (const mappingDoc of mappingSnapshot.docs) {
  const { materia_id, nombre_en_guia, num_reactivos } = mappingDoc.data();
  
  const progresoDoc = await db.collection("usuarios")
    .doc(userId)
    .collection("progreso_materias")
    .doc(materia_id)
    .get();
  
  const ratio = progresoDoc.exists ? progresoDoc.data().ratio : 0;
}
```

### Pantalla 4: Temas de una materia
```javascript
const snapshot = await db.collection("materias")
  .doc(materiaId)
  .collection("temas")
  .orderBy("orden")
  .get();

// + progreso por tema
for (const temaDoc of snapshot.docs) {
  const progresoDoc = await db.collection("usuarios")
    .doc(userId)
    .collection("progreso_temas")
    .doc(temaDoc.id)
    .get();
}
```

### Pantalla 5: Subtemas de un tema
```javascript
const snapshot = await db.collection("materias")
  .doc(materiaId)
  .collection("temas")
  .doc(temaId)
  .collection("subtemas")
  .orderBy("orden")
  .get();

// + progreso por subtema
for (const subDoc of snapshot.docs) {
  const progresoDoc = await db.collection("usuarios")
    .doc(userId)
    .collection("progreso_subtemas")
    .doc(subDoc.id)
    .get();
}
```

### Pantalla 6: Obtener preguntas para practicar

```javascript
// CASO A: Practicar un SUBTEMA específico
const snapshot = await db.collection("preguntas")
  .where("subtema_id", "==", subtemaId)
  .limit(30)
  .get();

// CASO B: Practicar un TEMA completo (todos sus subtemas)
// Primero obtener los subtema_ids del tema
const subtemasSnapshot = await db.collection("materias")
  .doc(materiaId)
  .collection("temas")
  .doc(temaId)
  .collection("subtemas")
  .get();

const subtemaIds = subtemasSnapshot.docs.map(doc => doc.id);

// Firestore limita "in" a 30 valores, así que partir en chunks si es necesario
const chunks = [];
for (let i = 0; i < subtemaIds.length; i += 30) {
  chunks.push(subtemaIds.slice(i, i + 30));
}

let preguntas = [];
for (const chunk of chunks) {
  const snap = await db.collection("preguntas")
    .where("subtema_id", "in", chunk)
    .limit(30)
    .get();
  preguntas.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// CASO C: Practicar una MATERIA completa
const snapshot = await db.collection("preguntas")
  .where("materia_id", "==", materiaId)
  .limit(30)
  .get();
```

---

## 4. LÓGICA DE RESPUESTA Y ACTUALIZACIÓN DE PROGRESO

Cuando el alumno responde una pregunta:

```javascript
async function registrarRespuesta(userId, pregunta, opcionElegida) {
  const esCorrecta = pregunta.opciones[opcionElegida].es_correcta;
  const batch = db.batch();

  // 1. Guardar en historial
  const historialRef = db.collection("usuarios").doc(userId)
    .collection("historial_respuestas").doc();
  batch.set(historialRef, {
    pregunta_id: pregunta.id,
    materia_id: pregunta.materia_id,
    tema_id: pregunta.tema_id,
    subtema_id: pregunta.subtema_id,
    opcion_elegida: opcionElegida,
    correcta: esCorrecta,
    tiempo_respuesta_seg: tiempoTranscurrido,
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
  });

  // 2. Actualizar progreso_subtemas
  const subRef = db.collection("usuarios").doc(userId)
    .collection("progreso_subtemas").doc(pregunta.subtema_id);
  batch.set(subRef, {
    tema_id: pregunta.tema_id,
    materia_id: pregunta.materia_id,
    total_intentos: firebase.firestore.FieldValue.increment(1),
    aciertos: firebase.firestore.FieldValue.increment(esCorrecta ? 1 : 0),
    ultima_practica: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // 3. Actualizar progreso_temas
  const temaRef = db.collection("usuarios").doc(userId)
    .collection("progreso_temas").doc(pregunta.tema_id);
  batch.set(temaRef, {
    materia_id: pregunta.materia_id,
    total_intentos: firebase.firestore.FieldValue.increment(1),
    aciertos: firebase.firestore.FieldValue.increment(esCorrecta ? 1 : 0),
    ultima_practica: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // 4. Actualizar progreso_materias
  const matRef = db.collection("usuarios").doc(userId)
    .collection("progreso_materias").doc(pregunta.materia_id);
  batch.set(matRef, {
    total_intentos: firebase.firestore.FieldValue.increment(1),
    aciertos: firebase.firestore.FieldValue.increment(esCorrecta ? 1 : 0),
    ultima_practica: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // 5. Actualizar stats de la pregunta (global)
  const pregRef = db.collection("preguntas").doc(pregunta.id);
  batch.update(pregRef, {
    "stats.veces_respondida": firebase.firestore.FieldValue.increment(1),
    "stats.veces_correcta": firebase.firestore.FieldValue.increment(esCorrecta ? 1 : 0),
  });

  await batch.commit();

  // 6. Recalcular ratios (puede hacerse async o con Cloud Function)
  await recalcularRatios(userId, pregunta);
}

async function recalcularRatios(userId, pregunta) {
  // Subtema
  const subDoc = await db.collection("usuarios").doc(userId)
    .collection("progreso_subtemas").doc(pregunta.subtema_id).get();
  if (subDoc.exists) {
    const data = subDoc.data();
    const ratio = data.total_intentos > 0 ? data.aciertos / data.total_intentos : 0;
    const nivel = ratio >= 0.8 ? "avanzado" : ratio >= 0.5 ? "intermedio" : "principiante";
    await subDoc.ref.update({ ratio, nivel_dominio: nivel });
  }

  // Tema
  const temaDoc = await db.collection("usuarios").doc(userId)
    .collection("progreso_temas").doc(pregunta.tema_id).get();
  if (temaDoc.exists) {
    const data = temaDoc.data();
    const ratio = data.total_intentos > 0 ? data.aciertos / data.total_intentos : 0;
    const nivel = ratio >= 0.8 ? "avanzado" : ratio >= 0.5 ? "intermedio" : "principiante";
    await temaDoc.ref.update({ ratio, nivel_dominio: nivel });
  }

  // Materia
  const matDoc = await db.collection("usuarios").doc(userId)
    .collection("progreso_materias").doc(pregunta.materia_id).get();
  if (matDoc.exists) {
    const data = matDoc.data();
    const ratio = data.total_intentos > 0 ? data.aciertos / data.total_intentos : 0;
    const nivel = ratio >= 0.8 ? "avanzado" : ratio >= 0.5 ? "intermedio" : "principiante";
    await matDoc.ref.update({ ratio, nivel_dominio: nivel });
  }
}
```

---

## 5. MOSTRAR RETROALIMENTACIÓN

La retroalimentación es por opción, no por pregunta. Después de que el alumno selecciona:

```javascript
function mostrarRetroalimentacion(pregunta, opcionElegida) {
  const opcion = pregunta.opciones[opcionElegida];

  if (opcion.es_correcta) {
    // Mostrar en verde
    mostrar("✅ ¡Correcto!", opcion.explicacion);
  } else {
    // Mostrar en rojo la explicación de la opción elegida
    mostrar("❌ Incorrecto", opcion.explicacion);

    // Opcionalmente mostrar cuál era la correcta
    const correcta = pregunta.opciones.find(o => o.es_correcta);
    mostrar("La respuesta correcta era:", correcta.texto);
    mostrar("Porque:", correcta.explicacion);
  }
}
```

---

## 6. NIVELES DE PRÁCTICA (Resumen)

| Nivel | Query Firestore | Descripción |
|-------|----------------|-------------|
| Materia completa | `preguntas WHERE materia_id == X` | Preguntas de TODOS los temas y subtemas |
| Tema (unidad) | `preguntas WHERE subtema_id IN [ids del tema]` | Preguntas de TODOS los subtemas del tema |
| Subtema | `preguntas WHERE subtema_id == X` | Preguntas de UN subtema específico |
| Debilidades | `preguntas WHERE subtema_id IN [subtemas_debiles]` | Preguntas de donde el alumno va peor |

---

## 7. DATOS REALES EN FIRESTORE

El script generador ya creó las siguientes materias con sus temas y subtemas:

| Materia | Temas | Subtemas | Preguntas (30/subtema) |
|---------|-------|----------|----------------------|
| Español | 7 | 29 | 870 |
| Matemáticas | 14 | 50 | 1,500 |
| Física | 9 | 44 | 1,320 |
| Química | 5 | 23 | 690 |
| Biología | 6 | 25 | 750 |
| Historia Universal | 9 | 26 | 780 |
| Historia de México | 8 | 31 | 930 |
| Literatura | 3 | 12 | 360 |
| Geografía | 2 | 21 | 630 |
| **Total** | **63** | **261** | **7,830** |

El examen real UNAM tiene 120 preguntas distribuidas en estas 9 materias.

---

## 8. NOTAS PARA EL DESARROLLADOR

1. **Los IDs no son legibles** - Son autogenerados por Firestore (ej: "xK7mN2pQ9rT"). Usa `nombre_canonical` para mostrar al usuario.

2. **El campo `orden`** en temas y subtemas garantiza que se muestren en el mismo orden que la guía UNAM. Siempre ordena por este campo.

3. **Los sinónimos** existen para búsqueda futura y para vincular distintas guías que nombran lo mismo de forma diferente.

4. **No todas las preguntas tienen imagen** - Solo ~5-15% tienen `imagen_url`. El frontend debe manejar ambos casos.

5. **Las opciones son un array de 4 objetos**, no strings. Cada opción tiene `texto`, `explicacion` y `es_correcta`.

6. **El progreso del usuario usa `merge: true`** para crear el documento si no existe o actualizarlo si ya existe.

7. **`resumen_debilidades`** se debe recalcular periódicamente (al terminar una sesión de práctica). Es un documento resumen para queries rápidas desde el frontend.

8. **Firebase "in" query** tiene límite de 30 valores. Para temas con más de 30 subtemas, hacer queries en chunks.
