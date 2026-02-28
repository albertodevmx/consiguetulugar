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
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  preguntas_semana: number;
  fecha_inicio_semana: string | null;
  fecha_registro: Timestamp;
}
