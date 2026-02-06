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
import { SchoolSubjectTopic } from '../models';

@Injectable({ providedIn: 'root' })
export class SchoolSubjectTopicService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'schoolSubjectTopics');

  list(): Observable<SchoolSubjectTopic[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      SchoolSubjectTopic[]
    >;
  }

  listBySchoolSubject(
    schoolId: string,
    subjectId: string,
  ): Observable<SchoolSubjectTopic[]> {
    const q = query(
      this.col,
      where('schoolId', '==', schoolId),
      where('subjectId', '==', subjectId),
    );
    return collectionData(q, { idField: 'id' }) as Observable<
      SchoolSubjectTopic[]
    >;
  }

  add(schoolSubjectId: string, schoolId: string, subjectId: string, topicId: string) {
    return addDoc(this.col, {
      schoolSubjectId,
      schoolId,
      subjectId,
      topicId,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'schoolSubjectTopics', id));
  }
}
