import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();

  readonly isLoggedIn = () => this._user() !== null;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this._user.set(user);
    });
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }
}
