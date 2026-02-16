import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Materia } from '../models';

@Injectable({ providedIn: 'root' })
export class MateriaService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'materias');

  list(): Observable<Materia[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<Materia[]>;
  }

  get(id: string): Observable<Materia | undefined> {
    const ref = doc(this.fs, 'materias', id);
    return from(getDoc(ref)).pipe(
      map((snap) =>
        snap.exists() ? ({ id: snap.id, ...snap.data() } as Materia) : undefined,
      ),
    );
  }
}
