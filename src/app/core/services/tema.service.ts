import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Tema } from '../models';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly fs = inject(Firestore);

  /** List temas subcollection for a materia, ordered by 'orden' */
  listByMateria(materiaId: string): Observable<Tema[]> {
    const subCol = collection(this.fs, `materias/${materiaId}/temas`);
    const q = query(subCol, orderBy('orden'));
    return collectionData(q, { idField: 'id' }) as Observable<Tema[]>;
  }
}
