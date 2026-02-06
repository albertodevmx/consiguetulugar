import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { SchoolExamType } from '../models';

@Injectable({ providedIn: 'root' })
export class SchoolExamTypeService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'schoolExamTypes');

  list(): Observable<SchoolExamType[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      SchoolExamType[]
    >;
  }

  add(schoolId: string, examTypeId: string) {
    return addDoc(this.col, {
      schoolId,
      examTypeId,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'schoolExamTypes', id));
  }
}
