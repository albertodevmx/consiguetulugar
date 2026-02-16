import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Examen, MateriaMapping } from '../models';

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

  /** Get unique school names from examenes collection */
  getEscuelas(): Observable<string[]> {
    return this.list().pipe(
      map((examenes) => [...new Set(examenes.map((e) => e.escuela))].sort()),
    );
  }

  /** Get materias_mapping subcollection for an exam */
  listMateriasMapping(examenId: string): Observable<MateriaMapping[]> {
    const subCol = collection(this.fs, `examenes/${examenId}/materias_mapping`);
    return collectionData(subCol, { idField: 'id' }) as Observable<MateriaMapping[]>;
  }
}
