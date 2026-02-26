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
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Examen, TemaConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class ExamenService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'examenes');

  list(): Observable<Examen[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<Examen[]>;
  }

  listByEscuela(escuela: string): Observable<Examen[]> {
    const q = query(this.col, where('escuela', '==', escuela));
    return collectionData(q, { idField: 'id' }) as Observable<Examen[]>;
  }

  getEscuelas(): Observable<string[]> {
    return this.list().pipe(
      map((examenes) => [...new Set(examenes.map((e) => e.escuela))].sort()),
    );
  }

  /* ── temas_config subcollection ── */

  listTemasConfig(examenId: string): Observable<TemaConfig[]> {
    const subCol = collection(this.fs, `examenes/${examenId}/temas_config`);
    const q = query(subCol, orderBy('orden'));
    return collectionData(q, { idField: 'id' }) as Observable<TemaConfig[]>;
  }

  /* ── Examen CRUD ── */

  add(data: Omit<Examen, 'id' | 'fecha_creacion'>) {
    return addDoc(this.col, { ...data, fecha_creacion: serverTimestamp() });
  }

  update(id: string, data: Partial<Examen>) {
    return updateDoc(doc(this.fs, 'examenes', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'examenes', id));
  }

  /* ── TemaConfig CRUD ── */

  addTemaConfig(examenId: string, data: Omit<TemaConfig, 'id'>) {
    const subCol = collection(this.fs, `examenes/${examenId}/temas_config`);
    return addDoc(subCol, data);
  }

  updateTemaConfig(examenId: string, configId: string, data: Partial<TemaConfig>) {
    return updateDoc(doc(this.fs, `examenes/${examenId}/temas_config`, configId), data);
  }

  deleteTemaConfig(examenId: string, configId: string) {
    return deleteDoc(doc(this.fs, `examenes/${examenId}/temas_config`, configId));
  }
}
