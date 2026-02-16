import { Timestamp } from '@angular/fire/firestore';

export interface TemaMapping {
  tema_id: string;
  nombre_en_guia: string;
}

export interface MateriaMapping {
  id?: string;
  materia_id: string;
  nombre_en_guia: string;
  num_reactivos: number;
  temas_mapping: TemaMapping[];
}

export interface Examen {
  id?: string;
  escuela: string;
  nombre: string;
  area: string;
  año: number;
  total_reactivos: number;
  distribucion: Record<string, number>;
  archivo_guia_url: string | null;
  fecha_creacion: Timestamp;
}
