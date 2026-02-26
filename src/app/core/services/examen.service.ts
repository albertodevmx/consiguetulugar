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
    return (collectionData(q, { idField: 'id' }) as Observable<Examen[]>).pipe(
      map((exams) => exams.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))),
    );
  }

  getEscuelas(): Observable<{ nombre: string; orden: number }[]> {
    return this.list().pipe(
      map((examenes) => {
        const map = new Map<string, number>();
        for (const e of examenes) {
          if (!map.has(e.escuela) || (e.escuela_orden ?? 99) < map.get(e.escuela)!) {
            map.set(e.escuela, e.escuela_orden ?? 99);
          }
        }
        return [...map.entries()]
          .map(([nombre, orden]) => ({ nombre, orden }))
          .sort((a, b) => a.orden - b.orden);
      }),
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
