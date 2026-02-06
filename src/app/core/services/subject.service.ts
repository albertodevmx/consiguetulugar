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
import { Subject } from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'subjects');

  list(): Observable<Subject[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      Subject[]
    >;
  }

  add(data: Pick<Subject, 'name' | 'slug'>) {
    return addDoc(this.col, {
      ...data,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: Partial<Subject>) {
    return updateDoc(doc(this.fs, 'subjects', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'subjects', id));
  }
}
