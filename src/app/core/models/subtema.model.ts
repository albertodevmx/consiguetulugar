import { Timestamp } from '@angular/fire/firestore';

export interface Subtema {
  id?: string;
  nombre_canonical: string;
  sinonimos: string[];
  orden: number;
  materia_id: string;
  tema_id: string;
  nivel_dificultad_promedio: number;
  total_preguntas: number;
  fecha_creacion: Timestamp;
}
