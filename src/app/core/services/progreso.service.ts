import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  collection,
  increment,
  arrayUnion,
  arrayRemove,
  collectionData,
  docData,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Pregunta } from '../models';
import { ProgresoTema } from '../models/progreso.model';

@Injectable({ providedIn: 'root' })
export class ProgresoService {
  private readonly fs = inject(Firestore);
  private readonly auth = inject(AuthService);

  async recordAnswer(pregunta: Pregunta, correcta: boolean): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid || !pregunta.id) return;

    const ref = doc(this.fs, 'usuarios', uid, 'progreso', pregunta.tema_id);

    await setDoc(
      ref,
      {
        tema_id: pregunta.tema_id,
        materia_id: pregunta.materia_id,
        total: increment(1),
        correctas: correcta ? increment(1) : increment(0),
        falladas: correcta
          ? arrayRemove(pregunta.id)
          : arrayUnion(pregunta.id),
      },
      { merge: true },
    );
  }

  async markCompleted(temaId: string, materiaId: string): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;

    const ref = doc(this.fs, 'usuarios', uid, 'progreso', temaId);
    await setDoc(
      ref,
      {
        tema_id: temaId,
        materia_id: materiaId,
        completado: true,
      },
      { merge: true },
    );
  }

  /** Real-time observable of progress for a specific topic */
  getProgreso$(temaId: string): Observable<ProgresoTema | undefined> {
    const uid = this.auth.user()?.uid;
    if (!uid) return of(undefined);

    const ref = doc(this.fs, 'usuarios', uid, 'progreso', temaId);
    return docData(ref) as Observable<ProgresoTema | undefined>;
  }

  /** Real-time observable of all progress */
  getAllProgreso$(): Observable<ProgresoTema[]> {
    const uid = this.auth.user()?.uid;
    if (!uid) return of([]);

    const col = collection(this.fs, 'usuarios', uid, 'progreso');
    return collectionData(col) as Observable<ProgresoTema[]>;
  }
}
