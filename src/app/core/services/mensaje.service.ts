import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Mensaje, TipoMensaje, OrigenMensaje } from '../models';
import { AuthService } from '../auth/auth.service';
import { sanitizeMessage } from '../utils/sanitize-message';

@Injectable({ providedIn: 'root' })
export class MensajeService {
  private readonly fs = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly col = collection(this.fs, 'mensajes');

  /**
   * Send a feedback/opinion message.
   * Sanitizes the text and attaches user info if logged in.
   */
  async enviar(
    texto: string,
    tipo: TipoMensaje,
    origen: OrigenMensaje,
    preguntaId?: string,
    preguntaTexto?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const result = sanitizeMessage(texto);
    if (!result.valid) {
      return { success: false, error: result.error! };
    }

    const user = this.auth.user();
    const profile = this.auth.profile();

    const mensaje: Omit<Mensaje, 'id'> = {
      tipo,
      origen,
      texto: result.sanitized,
      pregunta_id: preguntaId ?? null,
      pregunta_texto: preguntaTexto ?? null,
      usuario_id: user?.uid ?? null,
      usuario_nombre: profile?.nombre ?? null,
      usuario_email: profile?.email ?? null,
      estado: 'nuevo',
      fecha_creacion: serverTimestamp() as any,
    };

    await addDoc(this.col, mensaje);
    return { success: true };
  }

  /** List all messages ordered by newest first (admin) */
  listAll(max = 200): Observable<Mensaje[]> {
    const q = query(this.col, orderBy('fecha_creacion', 'desc'), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Mensaje[]>;
  }

  /** List only reported questions (admin) */
  listReportes(max = 200): Observable<Mensaje[]> {
    const q = query(
      this.col,
      where('tipo', '==', 'reporte'),
      orderBy('fecha_creacion', 'desc'),
      limit(max),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Mensaje[]>;
  }

  /** List feedback/opinions (non-reports) */
  listFeedback(max = 200): Observable<Mensaje[]> {
    const q = query(
      this.col,
      where('tipo', 'in', ['opinion', 'feedback']),
      orderBy('fecha_creacion', 'desc'),
      limit(max),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Mensaje[]>;
  }

  /** Count new (unread) messages */
  listNuevos(): Observable<Mensaje[]> {
    const q = query(this.col, where('estado', '==', 'nuevo'));
    return collectionData(q, { idField: 'id' }) as Observable<Mensaje[]>;
  }

  /** Mark a message as read */
  marcarLeido(id: string) {
    return updateDoc(doc(this.fs, 'mensajes', id), { estado: 'leido' });
  }

  /** Archive a message */
  archivar(id: string) {
    return updateDoc(doc(this.fs, 'mensajes', id), { estado: 'archivado' });
  }

  /** Delete a message */
  eliminar(id: string) {
    return deleteDoc(doc(this.fs, 'mensajes', id));
  }
}
