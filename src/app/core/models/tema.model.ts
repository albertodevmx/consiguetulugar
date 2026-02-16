import { Timestamp } from '@angular/fire/firestore';

export interface Tema {
  id?: string;
  nombre_canonical: string;
  sinonimos: string[];
  orden: number;
  materia_id: string;
  fecha_creacion: Timestamp;
}
