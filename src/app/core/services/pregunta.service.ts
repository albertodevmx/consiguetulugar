import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable, of, map, combineLatest } from 'rxjs';
import { Pregunta } from '../models';

/** Exclude questions that have an image */
function sinImagenes(obs$: Observable<Pregunta[]>): Observable<Pregunta[]> {
  return obs$.pipe(map((qs) => qs.filter((q) => !q.imagen_url)));
}

@Injectable({ providedIn: 'root' })
export class PreguntaService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'preguntas');

  /* ── Public queries (practice) ── */

  listByTema(temaId: string, max = 200): Observable<Pregunta[]> {
    const q = query(this.col, where('tema_id', '==', temaId), limit(max));
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  listByTemaIds(temaIds: string[], max = 500): Observable<Pregunta[]> {
    if (temaIds.length === 0) return of([]);
    const chunks: string[][] = [];
    for (let i = 0; i < temaIds.length; i += 30) {
      chunks.push(temaIds.slice(i, i + 30));
    }
    const queries = chunks.map((ids) => {
      const q = query(this.col, where('tema_id', 'in', ids), limit(max));
      return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
    });
    return combineLatest(queries).pipe(
      map((results) => results.flat()),
      map((qs) => qs.filter((q) => !q.imagen_url)),
    );
  }

  listByMateria(materiaId: string, max = 200): Observable<Pregunta[]> {
    const q = query(this.col, where('materia_id', '==', materiaId), limit(max));
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  listAll(max = 100): Observable<Pregunta[]> {
    const q = query(this.col, limit(max));
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  /* ── Admin queries (no image filter, higher limits) ── */

  adminListAll(max = 300): Observable<Pregunta[]> {
    const q = query(this.col, limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  adminListByMateria(materiaId: string, max = 500): Observable<Pregunta[]> {
    const q = query(this.col, where('materia_id', '==', materiaId), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  adminListByTema(temaId: string, max = 500): Observable<Pregunta[]> {
    const q = query(this.col, where('tema_id', '==', temaId), limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  /* ── CRUD ── */

  add(data: Omit<Pregunta, 'id' | 'fecha_creacion'>) {
    return addDoc(this.col, { ...data, fecha_creacion: new Date() });
  }

  update(id: string, data: Partial<Pregunta>) {
    return updateDoc(doc(this.fs, 'preguntas', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'preguntas', id));
  }

  async deleteBatch(ids: string[]) {
    const batchSize = 500;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = writeBatch(this.fs);
      const chunk = ids.slice(i, i + batchSize);
      for (const id of chunk) {
        batch.delete(doc(this.fs, 'preguntas', id));
      }
      await batch.commit();
    }
  }
}
