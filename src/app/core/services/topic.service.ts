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
import { Topic } from '../models';

@Injectable({ providedIn: 'root' })
export class TopicService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'topics');

  list(): Observable<Topic[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<Topic[]>;
  }

  add(data: Pick<Topic, 'name' | 'slug'>) {
    return addDoc(this.col, {
      ...data,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: Partial<Topic>) {
    return updateDoc(doc(this.fs, 'topics', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'topics', id));
  }
}
