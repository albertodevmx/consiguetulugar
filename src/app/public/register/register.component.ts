import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, NgClass],
  template: `
    <div class="auth-wrapper">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <div class="text-center mb-4">
            <img src="logo.png" alt="Consigue tu lugar" class="auth-logo mb-2">
            <h2 class="card-title mb-1">Crear cuenta</h2>
            <p class="text-muted small">Regístrate para comenzar a practicar</p>
          </div>

          @if (errorMessage()) {
            <div class="alert alert-danger py-2" role="alert">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" #form="ngForm">
            <!-- Nombre -->
            <div class="mb-3">
              <label for="nombre" class="form-label">
                <i class="bi bi-person me-1"></i>Nombre completo
              </label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
                <input
                  type="text"
                  id="nombre"
                  class="form-control"
                  [(ngModel)]="nombre"
                  name="nombre"
                  required
                  minlength="3"
                  placeholder="Tu nombre completo"
                  #nombreCtrl="ngModel"
                >
              </div>
              @if (nombreCtrl.invalid && nombreCtrl.touched) {
                <small class="text-danger">El nombre es obligatorio (mín. 3 caracteres).</small>
              }
            </div>

            <!-- Email -->
            <div class="mb-3">
              <label for="email" class="form-label">
                <i class="bi bi-envelope me-1"></i>Correo electrónico
              </label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope-fill"></i></span>
                <input
                  type="email"
                  id="email"
                  class="form-control"
                  [(ngModel)]="email"
                  name="email"
                  required
                  email
                  placeholder="correo@ejemplo.com"
                  autocomplete="email"
                  #emailCtrl="ngModel"
                >
              </div>
              @if (emailCtrl.invalid && emailCtrl.touched) {
                <small class="text-danger">Ingresa un correo válido.</small>
              }
            </div>

            <!-- Teléfono -->
            <div class="mb-3">
              <label for="telefono" class="form-label">
                <i class="bi bi-telephone me-1"></i>Teléfono
              </label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-telephone-fill"></i></span>
                <input
                  type="tel"
                  id="telefono"
                  class="form-control"
                  [(ngModel)]="telefono"
                  name="telefono"
                  required
                  minlength="10"
                  placeholder="10 dígitos"
                  #telefonoCtrl="ngModel"
                >
              </div>
              @if (telefonoCtrl.invalid && telefonoCtrl.touched) {
                <small class="text-danger">Teléfono obligatorio (mín. 10 dígitos).</small>
              }
            </div>

            <!-- Contraseña -->
            <div class="mb-3">
              <label for="password" class="form-label">
                <i class="bi bi-lock me-1"></i>Contraseña
              </label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  class="form-control"
                  [(ngModel)]="password"
                  name="password"
                  required
                  minlength="6"
                  placeholder="Mínimo 6 caracteres"
                  autocomplete="new-password"
                  #passwordCtrl="ngModel"
                >
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  (click)="showPassword.set(!showPassword())"
                  tabindex="-1"
                >
                  <i [class]="showPassword() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              @if (passwordCtrl.invalid && passwordCtrl.touched) {
                <small class="text-danger">La contraseña debe tener al menos 6 caracteres.</small>
              }
            </div>

            <!-- Confirmar Contraseña -->
            <div class="mb-4">
              <label for="confirmPassword" class="form-label">
                <i class="bi bi-lock me-1"></i>Confirmar contraseña
              </label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-shield-lock-fill"></i></span>
                <input
                  [type]="showConfirm() ? 'text' : 'password'"
                  id="confirmPassword"
                  class="form-control"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="Repite tu contraseña"
                  autocomplete="new-password"
                  #confirmCtrl="ngModel"
                  [ngClass]="{'is-invalid': confirmCtrl.touched && password !== confirmPassword}"
                >
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  (click)="showConfirm.set(!showConfirm())"
                  tabindex="-1"
                >
                  <i [class]="showConfirm() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              @if (confirmCtrl.touched && password !== confirmPassword) {
                <small class="text-danger">Las contraseñas no coinciden.</small>
              }
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-2"
              [disabled]="loading() || form.invalid || password !== confirmPassword"
            >
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-1"></span> Registrando...
              } @else {
                <i class="bi bi-person-plus me-1"></i> Crear cuenta
              }
            </button>
          </form>

          <p class="text-center mt-3 mb-0 small">
            ¿Ya tienes cuenta?
            <a [routerLink]="['/login']" [queryParams]="forwardParams()" class="fw-bold">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 120px);
      padding: 1rem;

      .card {
        width: 100%;
        max-width: 440px;
      }
    }
    .auth-logo {
      height: 56px;
      width: auto;
      object-fit: contain;
    }
  `],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  private examenId = this.route.snapshot.queryParamMap.get('examenId');

  nombre = '';
  email = '';
  telefono = '';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirm = signal(false);
  errorMessage = signal('');
  loading = signal(false);

  /** Preserves returnUrl/examenId when switching to the login page */
  forwardParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.returnUrl) params['returnUrl'] = this.returnUrl;
    if (this.examenId) params['examenId'] = this.examenId;
    return params;
  }

  async onSubmit() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);

    try {
      await this.auth.register({
        nombre: this.nombre,
        email: this.email,
        telefono: this.telefono,
        password: this.password,
      });

      // Flow 2: came from subscription/unlock → go to payment
      if (this.returnUrl) {
        const qp: Record<string, string> = {};
        if (this.examenId) qp['examenId'] = this.examenId;
        this.router.navigate([this.returnUrl], { queryParams: qp });
      } else {
        // Flow 1: normal registration → go to explore
        this.router.navigate(['/explore']);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        this.errorMessage.set('Este correo ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        this.errorMessage.set('La contraseña es muy débil.');
      } else {
        this.errorMessage.set('Error al registrar. Intenta de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
