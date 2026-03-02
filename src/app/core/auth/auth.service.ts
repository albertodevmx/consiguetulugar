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
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Unsubscribe } from '@angular/fire/firestore';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly fs = inject(Firestore);
  private readonly ngZone = inject(NgZone);

  private readonly _user = signal<User | null>(null);
  private readonly _profile = signal<Usuario | null>(null);
  private readonly _profileLoaded = signal(false);
  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly profileLoaded = this._profileLoaded.asReadonly();

  /** Unsubscribe from the current Firestore profile listener */
  private profileUnsub: Unsubscribe | null = null;

  readonly isLoggedIn = () => this._user() !== null;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.ngZone.run(() => {
        this._user.set(user);
        if (user) {
          this._profileLoaded.set(false);
          this.listenProfile(user.uid);
        } else {
          this.stopListeningProfile();
          this._profile.set(null);
          this._profileLoaded.set(false);
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
        examenes_pagados: [],
        preguntas_semana: 0,
        fecha_inicio_semana: null,
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

  /** Update specific fields on the user profile in Firestore (listener auto-updates) */
  async updateProfile(fields: Partial<Omit<Usuario, 'id'>>) {
    const uid = this._user()?.uid;
    if (!uid) return;
    await updateDoc(doc(this.fs, 'usuarios', uid), fields as any);
  }

  /**
   * Listen to the user profile in real-time via onSnapshot.
   * Any change made by the Stripe webhook (or any other source)
   * is reflected instantly without requiring logout/login.
   */
  private listenProfile(uid: string) {
    this.stopListeningProfile();
    this.profileUnsub = onSnapshot(doc(this.fs, 'usuarios', uid), (snap) => {
      this.ngZone.run(() => {
        if (snap.exists()) {
          const data = snap.data() as Omit<Usuario, 'id'>;
          this._profile.set({
            ...data,
            id: snap.id,
            examenes_pagados: data.examenes_pagados ?? [],
            preguntas_semana: data.preguntas_semana ?? (data as any).preguntas_respondidas ?? 0,
            fecha_inicio_semana: data.fecha_inicio_semana ?? (data as any).fecha_preguntas_hoy ?? null,
          });
        }
        this._profileLoaded.set(true);
      });
    });
  }

  private stopListeningProfile() {
    if (this.profileUnsub) {
      this.profileUnsub();
      this.profileUnsub = null;
    }
  }
}
