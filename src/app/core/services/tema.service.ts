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
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Tema } from '../models';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly fs = inject(Firestore);

  listByMateria(materiaId: string): Observable<Tema[]> {
    const subCol = collection(this.fs, `materias/${materiaId}/temas`);
    const q = query(subCol, orderBy('orden'));
    return collectionData(q, { idField: 'id' }) as Observable<Tema[]>;
  }

  add(materiaId: string, data: Pick<Tema, 'nombre_canonical' | 'orden'>) {
    const subCol = collection(this.fs, `materias/${materiaId}/temas`);
    return addDoc(subCol, {
      ...data,
      materia_id: materiaId,
      sinonimos: [],
      fecha_creacion: serverTimestamp(),
    });
  }

  update(materiaId: string, temaId: string, data: Partial<Tema>) {
    return updateDoc(doc(this.fs, `materias/${materiaId}/temas`, temaId), data);
  }

  delete(materiaId: string, temaId: string) {
    return deleteDoc(doc(this.fs, `materias/${materiaId}/temas`, temaId));
  }
}
