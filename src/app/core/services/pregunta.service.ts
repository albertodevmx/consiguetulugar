import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable, of, map } from 'rxjs';
import { Pregunta } from '../models';

/** Exclude questions that have an image — those are incomplete/deficient */
function sinImagenes(obs$: Observable<Pregunta[]>): Observable<Pregunta[]> {
  return obs$.pipe(map((qs) => qs.filter((q) => !q.imagen_url)));
}

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
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  listBySubtemaIds(subtemaIds: string[], max = 50): Observable<Pregunta[]> {
    if (subtemaIds.length === 0) return of([]);
    const q = query(
      this.col,
      where('subtema_id', 'in', subtemaIds),
      limit(max),
    );
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  listByTema(temaId: string): Observable<Pregunta[]> {
    const q = query(this.col, where('tema_id', '==', temaId));
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  listByMateria(materiaId: string): Observable<Pregunta[]> {
    const q = query(this.col, where('materia_id', '==', materiaId));
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }

  listAll(max = 50): Observable<Pregunta[]> {
    const q = query(this.col, limit(max));
    return sinImagenes(collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>);
  }
}
