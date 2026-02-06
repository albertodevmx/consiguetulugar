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
import { SubjectUnit } from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectUnitService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'subjectUnits');

  list(): Observable<SubjectUnit[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      SubjectUnit[]
    >;
  }

  add(schoolId: string, examTypeId: string, subjectId: string, unitId: string) {
    return addDoc(this.col, {
      schoolId,
      examTypeId,
      subjectId,
      unitId,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'subjectUnits', id));
  }
}
