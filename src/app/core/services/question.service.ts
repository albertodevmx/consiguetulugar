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
  writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Question } from '../models';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'questions');

  list(): Observable<Question[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<
      Question[]
    >;
  }

  listByTopic(topicId: string): Observable<Question[]> {
    const q = query(this.col, where('topicId', '==', topicId));
    return collectionData(q, { idField: 'id' }) as Observable<Question[]>;
  }

  add(data: Omit<Question, 'id' | 'createdAt'>) {
    return addDoc(this.col, {
      ...data,
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: Partial<Question>) {
    return updateDoc(doc(this.fs, 'questions', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'questions', id));
  }

  async importBatch(questions: Omit<Question, 'id' | 'createdAt'>[]) {
    const batch = writeBatch(this.fs);
    for (const q of questions) {
      const ref = doc(this.col);
      batch.set(ref, { ...q, createdAt: serverTimestamp() });
    }
    return batch.commit();
  }
}
