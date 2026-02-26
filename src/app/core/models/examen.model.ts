import { Timestamp } from '@angular/fire/firestore';

export interface TemaConfig {
  id?: string;
  tema_id: string;
  nombre_mostrar: string;
  seccion: string;
  orden: number;
  num_reactivos: number;
  dificultades: number[];
}

export interface Examen {
  id?: string;
  escuela: string;
  nombre: string;
  area: string;
  año: number;
  total_reactivos: number;
  tiempo_limite_minutos: number;
  fecha_creacion: Timestamp;
}
