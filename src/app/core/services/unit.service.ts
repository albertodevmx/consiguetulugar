import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Unit } from '../models';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'units');

  list(): Observable<Unit[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<Unit[]>;
  }

  add(data: Pick<Unit, 'name' | 'slug'>) {
    return addDoc(this.col, {
      ...data,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: Partial<Unit>) {
    return updateDoc(doc(this.fs, 'units', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'units', id));
  }
}
