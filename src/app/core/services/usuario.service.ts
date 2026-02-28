import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly fs = inject(Firestore);
  private readonly col = collection(this.fs, 'usuarios');

  /** Update specific fields on a user profile */
  async update(uid: string, fields: Partial<Omit<Usuario, 'id'>>) {
    await updateDoc(doc(this.fs, 'usuarios', uid), fields as any);
  }

  /** List all users (real-time observable) */
  listAll(): Observable<Usuario[]> {
    const q = query(this.col, orderBy('fecha_registro', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Usuario[]>;
  }
}
