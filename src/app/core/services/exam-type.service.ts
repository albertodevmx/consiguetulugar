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
import { ExamType } from '../models';

@Injectable({ providedIn: 'root' })
export class ExamTypeService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'examTypes');

  list(): Observable<ExamType[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      ExamType[]
    >;
  }

  add(data: Pick<ExamType, 'name' | 'slug' | 'schoolId'>) {
    return addDoc(this.col, {
      ...data,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: Partial<ExamType>) {
    return updateDoc(doc(this.fs, 'examTypes', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'examTypes', id));
  }
}
