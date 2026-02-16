import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
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

  listByTema(temaId: string): Observable<Pregunta[]> {
    const q = query(this.col, where('tema_id', '==', temaId));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  listByMateria(materiaId: string, max = 30): Observable<Pregunta[]> {
    const q = query(
      this.col,
      where('materia_id', '==', materiaId),
      limit(max),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }

  listAll(max = 50): Observable<Pregunta[]> {
    const q = query(this.col, limit(max));
    return collectionData(q, { idField: 'id' }) as Observable<Pregunta[]>;
  }
}
