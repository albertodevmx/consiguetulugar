import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** TODO: conectar con Firebase Auth */
  private readonly _isLoggedIn = signal(false);
  readonly isLoggedIn = this._isLoggedIn.asReadonly();

  private readonly _isAdmin = signal(false);
  readonly isAdmin = this._isAdmin.asReadonly();
}
