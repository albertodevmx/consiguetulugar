import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { SchoolSubject } from '../models';

@Injectable({ providedIn: 'root' })
export class SchoolSubjectService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'schoolSubjects');

  list(): Observable<SchoolSubject[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      SchoolSubject[]
    >;
  }

  listBySchool(schoolId: string): Observable<SchoolSubject[]> {
    const q = query(this.col, where('schoolId', '==', schoolId));
    return collectionData(q, { idField: 'id' }) as Observable<
      SchoolSubject[]
    >;
  }

  add(schoolId: string, subjectId: string) {
    return addDoc(this.col, {
      schoolId,
      subjectId,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'schoolSubjects', id));
  }
}
