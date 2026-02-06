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
import { UnitTopic } from '../models';

@Injectable({ providedIn: 'root' })
export class UnitTopicService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'unitTopics');

  list(): Observable<UnitTopic[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      UnitTopic[]
    >;
  }

  add(
    schoolId: string,
    examTypeId: string,
    subjectId: string,
    unitId: string,
    topicId: string,
  ) {
    return addDoc(this.col, {
      schoolId,
      examTypeId,
      subjectId,
      unitId,
      topicId,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'unitTopics', id));
  }
}
