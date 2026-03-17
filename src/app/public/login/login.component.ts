import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-public-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <div class="text-center mb-4">
            <img src="logo.png" alt="Consigue tu lugar" class="auth-logo mb-2">
            <h2 class="card-title mb-1">Iniciar sesión</h2>
            <p class="text-muted small">Ingresa a tu cuenta para seguir practicando</p>
          </div>

          @if (errorMessage()) {
            <div class="alert alert-danger py-2" role="alert">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" #form="ngForm">
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
            </div>

            <!-- Contraseña -->
            <div class="mb-4">
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
                  placeholder="Tu contraseña"
                  autocomplete="current-password"
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
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-2"
              [disabled]="loading() || form.invalid"
            >
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-1"></span> Ingresando...
              } @else {
                <i class="bi bi-box-arrow-in-right me-1"></i> Entrar
              }
            </button>
          </form>

          <p class="text-center mt-3 mb-0 small">
            ¿No tienes cuenta?
            <a [routerLink]="['/registro']" [queryParams]="forwardParams()" class="fw-bold">Regístrate gratis</a>
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
export class PublicLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  private examenId = this.route.snapshot.queryParamMap.get('examenId');

  email = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal('');
  loading = signal(false);

  /** Preserves returnUrl/examenId when switching to the register page */
  forwardParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.returnUrl) params['returnUrl'] = this.returnUrl;
    if (this.examenId) params['examenId'] = this.examenId;
    return params;
  }

  async onSubmit() {
    this.errorMessage.set('');
    this.loading.set(true);

    try {
      await this.auth.login(this.email, this.password);

      // If came from subscription/unlock → go to payment
      if (this.returnUrl) {
        const qp: Record<string, string> = {};
        if (this.examenId) qp['examenId'] = this.examenId;
        this.router.navigate([this.returnUrl], { queryParams: qp });
      } else {
        this.router.navigate(['/']);
      }
    } catch {
      this.errorMessage.set('Correo o contraseña incorrectos.');
    } finally {
      this.loading.set(false);
    }
  }
}
