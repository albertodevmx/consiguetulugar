#!/bin/bash
# =============================================================
# Script para importar 10 preguntas: Funciones de la lengua
# (Referencial, Apelativa, Poetica)
#
# USO:
#   1. Pon tu import key y los IDs correctos abajo
#   2. chmod +x scripts/import-funciones-lengua.sh
#   3. ./scripts/import-funciones-lengua.sh
# =============================================================

# ─── CONFIGURACION ───────────────────────────────────────────
API_URL="https://us-central1-estudiarbarato.cloudfunctions.net/importPreguntas"
IMPORT_KEY="TU_IMPORT_KEY_AQUI"       # Valor de configuracion/import_key en Firestore
MATERIA_ID="TU_MATERIA_ID_AQUI"       # ID de la materia (ej: Español)
TEMA_ID="TU_TEMA_ID_AQUI"             # ID del tema "Funciones de la lengua"
# ─────────────────────────────────────────────────────────────

JSON=$(cat <<PAYLOAD
{
  "key": "$IMPORT_KEY",
  "preguntas": [
    {
      "texto": "¿Cual es la funcion del lenguaje cuyo proposito principal es informar o transmitir datos de manera objetiva?",
      "opciones": [
        {"texto": "Funcion referencial", "explicacion": "Correcta. La funcion referencial (o representativa) se centra en el contexto o referente, transmitiendo informacion objetiva sobre la realidad.", "es_correcta": true},
        {"texto": "Funcion apelativa", "explicacion": "Incorrecta. La funcion apelativa busca influir en el receptor para que haga algo, no informar objetivamente.", "es_correcta": false},
        {"texto": "Funcion poetica", "explicacion": "Incorrecta. La funcion poetica se centra en la forma del mensaje, en como se dice, no en informar.", "es_correcta": false},
        {"texto": "Funcion emotiva", "explicacion": "Incorrecta. La funcion emotiva expresa sentimientos o emociones del emisor.", "es_correcta": false}
      ],
      "dificultad": 1,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "referencial"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "Un anuncio publicitario que dice 'Compra ahora y obten un 50% de descuento' utiliza principalmente la funcion:",
      "opciones": [
        {"texto": "Apelativa", "explicacion": "Correcta. La funcion apelativa (o conativa) busca provocar una reaccion en el receptor, en este caso que compre el producto.", "es_correcta": true},
        {"texto": "Referencial", "explicacion": "Incorrecta. Aunque incluye datos, el proposito principal es persuadir al receptor, no solo informar.", "es_correcta": false},
        {"texto": "Poetica", "explicacion": "Incorrecta. No se centra en la belleza o forma del mensaje.", "es_correcta": false},
        {"texto": "Metalinguistica", "explicacion": "Incorrecta. La funcion metalinguistica se usa para hablar sobre el propio lenguaje.", "es_correcta": false}
      ],
      "dificultad": 1,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "apelativa"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "El verso 'Puedo escribir los versos mas tristes esta noche' de Pablo Neruda es un ejemplo de funcion:",
      "opciones": [
        {"texto": "Poetica", "explicacion": "Correcta. La funcion poetica se centra en la forma del mensaje, utilizando recursos literarios para crear belleza estetica.", "es_correcta": true},
        {"texto": "Referencial", "explicacion": "Incorrecta. Aunque comunica algo, el enfasis esta en la forma artistica del mensaje, no en informar.", "es_correcta": false},
        {"texto": "Apelativa", "explicacion": "Incorrecta. No busca provocar una accion en el receptor.", "es_correcta": false},
        {"texto": "Fatica", "explicacion": "Incorrecta. La funcion fatica se usa para verificar que el canal de comunicacion funcione.", "es_correcta": false}
      ],
      "dificultad": 1,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "poetica"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "En la oracion 'La temperatura en la Ciudad de Mexico es de 22 grados centigrados', ¿que funcion del lenguaje predomina?",
      "opciones": [
        {"texto": "Referencial", "explicacion": "Correcta. Se transmite informacion objetiva sobre un hecho verificable (la temperatura), que es la caracteristica principal de la funcion referencial.", "es_correcta": true},
        {"texto": "Emotiva", "explicacion": "Incorrecta. No se expresan sentimientos ni opiniones personales.", "es_correcta": false},
        {"texto": "Apelativa", "explicacion": "Incorrecta. No se intenta influir en el comportamiento del receptor.", "es_correcta": false},
        {"texto": "Poetica", "explicacion": "Incorrecta. No hay un enfasis en la forma estetica del mensaje.", "es_correcta": false}
      ],
      "dificultad": 1,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "referencial"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "¿Cual de las siguientes frases es un ejemplo claro de funcion apelativa?",
      "opciones": [
        {"texto": "No olvides traer tu credencial manana", "explicacion": "Correcta. Es una orden o peticion dirigida al receptor para que realice una accion, caracteristica de la funcion apelativa.", "es_correcta": true},
        {"texto": "Hoy amanecio nublado en Guadalajara", "explicacion": "Incorrecta. Es informacion objetiva, corresponde a la funcion referencial.", "es_correcta": false},
        {"texto": "Me siento muy triste por lo que paso", "explicacion": "Incorrecta. Expresa emociones del emisor, corresponde a la funcion emotiva.", "es_correcta": false},
        {"texto": "La palabra 'casa' tiene dos silabas", "explicacion": "Incorrecta. Habla sobre el lenguaje mismo, corresponde a la funcion metalinguistica.", "es_correcta": false}
      ],
      "dificultad": 2,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "apelativa"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "La funcion poetica del lenguaje se centra en:",
      "opciones": [
        {"texto": "La forma del mensaje y sus recursos estilisticos", "explicacion": "Correcta. La funcion poetica pone atencion en como se construye el mensaje, utilizando figuras retoricas, ritmo y otros recursos literarios.", "es_correcta": true},
        {"texto": "El contenido informativo del mensaje", "explicacion": "Incorrecta. Eso corresponde a la funcion referencial.", "es_correcta": false},
        {"texto": "La reaccion que se busca en el receptor", "explicacion": "Incorrecta. Eso corresponde a la funcion apelativa.", "es_correcta": false},
        {"texto": "El estado emocional del emisor", "explicacion": "Incorrecta. Eso corresponde a la funcion emotiva.", "es_correcta": false}
      ],
      "dificultad": 2,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "poetica"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "Un noticiero de television que reporta los hechos del dia utiliza predominantemente la funcion:",
      "opciones": [
        {"texto": "Referencial", "explicacion": "Correcta. Los noticieros buscan informar sobre hechos de manera objetiva, que es el proposito de la funcion referencial.", "es_correcta": true},
        {"texto": "Poetica", "explicacion": "Incorrecta. Los noticieros no se centran en la belleza del lenguaje.", "es_correcta": false},
        {"texto": "Fatica", "explicacion": "Incorrecta. La funcion fatica solo busca mantener abierto el canal de comunicacion.", "es_correcta": false},
        {"texto": "Emotiva", "explicacion": "Incorrecta. Los noticieros profesionales evitan expresar emociones personales.", "es_correcta": false}
      ],
      "dificultad": 2,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "referencial"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "Identifica la funcion del lenguaje en el siguiente texto: 'Ciudadanos, es momento de actuar. Acudan a las urnas y ejerzan su derecho al voto.'",
      "opciones": [
        {"texto": "Apelativa", "explicacion": "Correcta. El texto busca persuadir e incitar al receptor a realizar una accion concreta (votar), que es la esencia de la funcion apelativa.", "es_correcta": true},
        {"texto": "Referencial", "explicacion": "Incorrecta. Aunque menciona el voto, el proposito principal es motivar una accion, no informar.", "es_correcta": false},
        {"texto": "Poetica", "explicacion": "Incorrecta. No se enfoca en la forma estetica del mensaje.", "es_correcta": false},
        {"texto": "Emotiva", "explicacion": "Incorrecta. No expresa sentimientos personales del emisor.", "es_correcta": false}
      ],
      "dificultad": 2,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "apelativa"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "En el eslogan 'Rima con rima, palabra con palabra, tu historia se escribe en cada silaba', ¿que funcion del lenguaje predomina y por que?",
      "opciones": [
        {"texto": "Poetica, porque utiliza rima y repeticion como recursos estilisticos", "explicacion": "Correcta. La aliteracion, la rima y la repeticion son recursos que embellecen la forma del mensaje, caracteristica central de la funcion poetica.", "es_correcta": true},
        {"texto": "Referencial, porque habla sobre la escritura", "explicacion": "Incorrecta. Aunque menciona la escritura, el enfasis esta en la forma artistica, no en informar sobre ella.", "es_correcta": false},
        {"texto": "Apelativa, porque busca convencer al lector", "explicacion": "Incorrecta. Aunque un eslogan puede tener intencion persuasiva, en este caso el recurso dominante es la forma poetica.", "es_correcta": false},
        {"texto": "Metalinguistica, porque menciona palabras y silabas", "explicacion": "Incorrecta. No esta explicando reglas o conceptos del lenguaje, sino usando recursos estilisticos.", "es_correcta": false}
      ],
      "dificultad": 3,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "poetica", "analisis"],
      "creada_por": "import-script",
      "revisada": true
    },
    {
      "texto": "Un texto puede combinar varias funciones del lenguaje. En una carta de un padre a su hijo que dice: 'Hijo, estudia mucho (1). La universidad exige promedio minimo de 8.5 (2). Recuerda que tus suenos son estrellas que iluminan tu camino (3).' ¿Que funciones aparecen en las partes 1, 2 y 3 respectivamente?",
      "opciones": [
        {"texto": "Apelativa, Referencial, Poetica", "explicacion": "Correcta. (1) 'Estudia mucho' es una orden/peticion al receptor (apelativa). (2) El dato del promedio es informacion objetiva (referencial). (3) La metafora de los suenos como estrellas es un recurso estetico (poetica).", "es_correcta": true},
        {"texto": "Emotiva, Apelativa, Referencial", "explicacion": "Incorrecta. (1) No expresa sentimientos, da una instruccion. (2) No busca una accion, da un dato. (3) No informa, usa una metafora.", "es_correcta": false},
        {"texto": "Referencial, Metalinguistica, Emotiva", "explicacion": "Incorrecta. (1) No informa, ordena. (2) No habla del lenguaje, da un dato. (3) No expresa emociones directamente, usa un recurso literario.", "es_correcta": false},
        {"texto": "Poetica, Emotiva, Apelativa", "explicacion": "Incorrecta. El orden de las funciones no corresponde con las partes senaladas del texto.", "es_correcta": false}
      ],
      "dificultad": 3,
      "materia_id": "$MATERIA_ID",
      "tema_id": "$TEMA_ID",
      "tags": ["funciones del lenguaje", "apelativa", "referencial", "poetica", "analisis"],
      "creada_por": "import-script",
      "revisada": true
    }
  ]
}
PAYLOAD
)

echo "Enviando 10 preguntas a $API_URL ..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON" | python3 -m json.tool 2>/dev/null || echo "(respuesta recibida)"

echo ""
echo "Listo!"
