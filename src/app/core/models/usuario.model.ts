import { Timestamp } from '@angular/fire/firestore';

export type RolUsuario = 'admin' | 'editor' | 'usuario';

export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  telefono: string;
  foto_url: string | null;
  bio: string | null;
  rol: RolUsuario;
  examen_activo: string | null;
  plan: 'gratuito' | 'premium';
  examenes_pagados: string[];
  preguntas_respondidas: number;
  preguntas_hoy: number;
  fecha_preguntas_hoy: string | null;
  fecha_registro: Timestamp;
}
