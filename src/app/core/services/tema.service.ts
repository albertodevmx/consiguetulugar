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
import { Observable } from 'rxjs';
import { Tema } from '../models';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'temas');

  list(): Observable<Tema[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<Tema[]>;
  }

  listByMateria(materiaId: string): Observable<Tema[]> {
    const q = query(this.col, where('materia_id', '==', materiaId));
    return collectionData(q, { idField: 'id' }) as Observable<Tema[]>;
  }

  add(data: Pick<Tema, 'nombre_canonical' | 'materia_id'>) {
    return addDoc(this.col, {
      ...data,
      tags: [],
      total_preguntas: 0,
      leccion_html: null,
      fecha_creacion: serverTimestamp(),
    });
  }

  update(temaId: string, data: Partial<Tema>) {
    return updateDoc(doc(this.fs, 'temas', temaId), data);
  }

  delete(temaId: string) {
    return deleteDoc(doc(this.fs, 'temas', temaId));
  }
}
