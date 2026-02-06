import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { School } from '../models';

@Injectable({ providedIn: 'root' })
export class SchoolService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'schools');

  list(): Observable<School[]> {
    return collectionData(this.col, { idField: 'id' }) as Observable<School[]>;
  }

  get(id: string): Observable<School> {
    return docData(doc(this.fs, 'schools', id), {
      idField: 'id',
    }) as Observable<School>;
  }

  add(data: Pick<School, 'name' | 'slug'>) {
    return addDoc(this.col, {
      ...data,
      active: true,
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: Partial<School>) {
    return updateDoc(doc(this.fs, 'schools', id), data);
  }

  delete(id: string) {
    return deleteDoc(doc(this.fs, 'schools', id));
  }
}
