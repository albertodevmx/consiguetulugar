import { Timestamp } from '@angular/fire/firestore';

export interface Materia {
  id?: string;
  nombre_canonical: string;
  sinonimos: string[];
  icono: string | null;
  color: string | null;
  fecha_creacion: Timestamp;
}
