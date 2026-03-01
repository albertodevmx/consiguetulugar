import { Timestamp } from '@angular/fire/firestore';

export type TipoMensaje = 'opinion' | 'feedback' | 'reporte';
export type OrigenMensaje = 'home' | 'practicar' | 'pregunta';
export type EstadoMensaje = 'nuevo' | 'leido' | 'archivado';

export interface Mensaje {
  id?: string;
  tipo: TipoMensaje;
  origen: OrigenMensaje;
  texto: string;
  /** ID of the reported question (only for type 'reporte') */
  pregunta_id: string | null;
  /** Reported question text snapshot (only for type 'reporte') */
  pregunta_texto: string | null;
  /** User ID if logged in, null for anonymous */
  usuario_id: string | null;
  /** User name snapshot */
  usuario_nombre: string | null;
  /** User email snapshot */
  usuario_email: string | null;
  estado: EstadoMensaje;
  fecha_creacion: Timestamp;
}
