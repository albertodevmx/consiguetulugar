import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Subtema } from '../models';

@Injectable({ providedIn: 'root' })
export class SubtemaService {
  private readonly fs = inject(Firestore);

  /** List subtemas subcollection for a materia/tema, ordered by 'orden' */
  listByTema(materiaId: string, temaId: string): Observable<Subtema[]> {
    const subCol = collection(
      this.fs,
      `materias/${materiaId}/temas/${temaId}/subtemas`,
    );
    const q = query(subCol, orderBy('orden'));
    return collectionData(q, { idField: 'id' }) as Observable<Subtema[]>;
  }
}
