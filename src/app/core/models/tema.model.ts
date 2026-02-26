import { Timestamp } from '@angular/fire/firestore';

export interface Tema {
  id?: string;
  nombre_canonical: string;
  materia_id: string;
  tags: string[];
  total_preguntas: number;
  leccion_html: string | null;
  fecha_creacion: Timestamp;
}
