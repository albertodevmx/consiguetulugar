import { Injectable, inject, signal, NgZone } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly fs = inject(Firestore);
  private readonly ngZone = inject(NgZone);

  private readonly _user = signal<User | null>(null);
  private readonly _profile = signal<Usuario | null>(null);
  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();

  readonly isLoggedIn = () => this._user() !== null;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.ngZone.run(() => {
        this._user.set(user);
        if (user) {
          this.loadProfile(user.uid);
        } else {
          this._profile.set(null);
        }
      });
    });
  }

  async register(data: {
    nombre: string;
    email: string;
    telefono: string;
    password: string;
  }) {
    const cred = await this.ngZone.run(() =>
      createUserWithEmailAndPassword(this.auth, data.email, data.password),
    );

    // Auth user created — profile writes are best-effort
    try {
      await updateProfile(cred.user, { displayName: data.nombre });
    } catch (e) {
      console.warn('updateProfile failed:', e);
    }

    try {
      const userDoc: Omit<Usuario, 'id'> = {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        foto_url: null,
        bio: null,
        rol: 'usuario',
        examen_activo: null,
        plan: 'gratuito',
        fecha_registro: serverTimestamp() as any,
      };
      await setDoc(doc(this.fs, 'usuarios', cred.user.uid), userDoc);
    } catch (e) {
      console.warn('Firestore profile write failed:', e);
    }

    return cred;
  }

  login(email: string, password: string) {
    return this.ngZone.run(() =>
      signInWithEmailAndPassword(this.auth, email, password),
    );
  }

  logout() {
    return this.ngZone.run(() => signOut(this.auth));
  }

  private async loadProfile(uid: string) {
    const snap = await getDoc(doc(this.fs, 'usuarios', uid));
    if (snap.exists()) {
      this._profile.set({ id: snap.id, ...snap.data() } as Usuario);
    }
  }
}
