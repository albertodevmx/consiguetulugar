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
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Examen, MateriaMapping, TemaMapping } from '../models';

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

  listMateriasMapping(examenId: string): Observable<MateriaMapping[]> {
    const subCol = collection(this.fs, `examenes/${examenId}/materias_mapping`);
    return collectionData(subCol, { idField: 'id' }) as Observable<MateriaMapping[]>;
  }

  add(data: Omit<Examen, 'id' | 'fecha_creacion'>) {
    return addDoc(this.col, { ...data, fecha_creacion: serverTimestamp() });
  }

  update(id: string, data: Partial<Examen>) {
    return updateDoc(doc(this.fs, 'examenes', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'examenes', id));
  }

  // --- materias_mapping CRUD ---

  addMateriaMapping(examenId: string, data: Omit<MateriaMapping, 'id'>) {
    const subCol = collection(this.fs, `examenes/${examenId}/materias_mapping`);
    return addDoc(subCol, data);
  }

  updateMateriaMapping(examenId: string, mapId: string, data: Partial<MateriaMapping>) {
    return updateDoc(doc(this.fs, `examenes/${examenId}/materias_mapping`, mapId), data);
  }

  deleteMateriaMapping(examenId: string, mapId: string) {
    return deleteDoc(doc(this.fs, `examenes/${examenId}/materias_mapping`, mapId));
  }
}
