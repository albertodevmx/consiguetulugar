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
import { ExamTypeSubject } from '../models';

@Injectable({ providedIn: 'root' })
export class ExamTypeSubjectService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'examTypeSubjects');

  list(): Observable<ExamTypeSubject[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      ExamTypeSubject[]
    >;
  }

  add(examTypeId: string, subjectId: string) {
    return addDoc(this.col, {
      examTypeId,
      subjectId,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'examTypeSubjects', id));
  }
}
