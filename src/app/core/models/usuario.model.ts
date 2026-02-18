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
  fecha_registro: Timestamp;
}
