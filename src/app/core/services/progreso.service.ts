import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  increment,
  arrayUnion,
  arrayRemove,
} from '@angular/fire/firestore';
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

  async getProgreso(temaId: string): Promise<ProgresoTema | null> {
    const uid = this.auth.user()?.uid;
    if (!uid) return null;

    const ref = doc(this.fs, 'usuarios', uid, 'progreso', temaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as ProgresoTema;
  }

  async getAllProgreso(): Promise<ProgresoTema[]> {
    const uid = this.auth.user()?.uid;
    if (!uid) return [];

    const col = collection(this.fs, 'usuarios', uid, 'progreso');
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as ProgresoTema);
  }
}
