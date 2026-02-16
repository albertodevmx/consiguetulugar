import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { Pregunta } from '../models';

@Injectable({ providedIn: 'root' })
export class PreguntaService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'preguntas');

  listBySubtema(subtemaId: string, max = 30): Observable<Pregunta[]> {
    const q = query(
      this.col,
      where('subtema_id', '==', subtemaId),
      limit(max),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  /** Query preguntas whose subtema_id is in the given list (max 30 per Firestore 'in' limit) */
  listBySubtemaIds(subtemaIds: string[], max = 50): Observable<Pregunta[]> {
    if (subtemaIds.length === 0) return of([]);
    const q = query(
      this.col,
      where('subtema_id', 'in', subtemaIds),
      limit(max),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  listByTema(temaId: string): Observable<Pregunta[]> {
    const q = query(this.col, where('tema_id', '==', temaId));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  listByMateria(materiaId: string): Observable<Pregunta[]> {
    const q = query(this.col, where('materia_id', '==', materiaId));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  listAll(max = 50): Observable<Pregunta[]> {
    const q = query(this.col, limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }
}
