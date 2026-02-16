import { Timestamp } from '@angular/fire/firestore';

export interface OpcionPregunta {
  texto: string;
  explicacion: string;
  es_correcta: boolean;
}

export interface PreguntaStats {
  veces_respondida: number;
  veces_correcta: number;
  ratio_acierto: number;
  ratio_por_opcion: number[];
}

export interface Pregunta {
  id?: string;
  texto: string;
  opciones: OpcionPregunta[];
  dificultad: 1 | 2 | 3;
  materia_id: string;
  tema_id: string;
  subtema_id: string;
  imagen_url: string | null;
  imagen_descripcion: string | null;
  tags: string[];
  stats: PreguntaStats;
  creada_por: string;
  revisada: boolean;
  fecha_creacion: Timestamp;
}
