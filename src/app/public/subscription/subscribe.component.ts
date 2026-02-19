import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StripeService } from '../../core/services/stripe.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-5">
      <div class="text-center mb-4">
        <img src="logo.png" alt="Estudiar es barato" class="mb-3" style="width: 80px; height: 80px;">
        <h1>Suscríbete a Estudiar es barato</h1>
        <p class="text-muted fs-5">Accede a todo el material de estudio con una suscripción mensual.</p>
      </div>

      <div class="row justify-content-center">
        <div class="col-12 col-sm-10 col-md-6 col-lg-5">
          <div class="card shadow border-0">
            <div class="card-header text-center bg-primary text-white py-3">
              <h4 class="mb-0"><i class="bi bi-star-fill me-2"></i>Plan Premium</h4>
            </div>
            <div class="card-body text-center p-4">
              <div class="mb-3">
                <span class="display-4 fw-bold text-primary">$99</span>
                <span class="text-muted fs-5"> MXN / mes</span>
              </div>

              <ul class="list-unstyled text-start mb-4">
                <li class="py-2 border-bottom">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>Acceso a todas las materias
                </li>
                <li class="py-2 border-bottom">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>Miles de preguntas con explicación
                </li>
                <li class="py-2 border-bottom">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>Seguimiento de tu progreso
                </li>
                <li class="py-2 border-bottom">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>Práctica ilimitada
                </li>
                <li class="py-2">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>Cancela cuando quieras
                </li>
              </ul>

              @if (errorMessage()) {
                <div class="alert alert-danger py-2 small">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ errorMessage() }}
                </div>
              }

              @if (!auth.isLoggedIn()) {
                <p class="text-muted small mb-3">Necesitas una cuenta para suscribirte</p>
                <a routerLink="/registro" class="btn btn-primary btn-lg w-100 py-2">
                  <i class="bi bi-person-plus me-1"></i> Crear cuenta y suscribirme
                </a>
                <p class="mt-2 small">
                  ¿Ya tienes cuenta? <a routerLink="/login" class="fw-bold">Inicia sesión</a>
                </p>
              } @else {
                <button
                  class="btn btn-primary btn-lg w-100 py-2"
                  (click)="subscribe()"
                  [disabled]="loading()"
                >
                  @if (loading()) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Procesando...
                  } @else {
                    <i class="bi bi-credit-card me-1"></i> Suscribirme ahora
                  }
                </button>
                <p class="text-muted small mt-3 mb-0">
                  <i class="bi bi-shield-lock me-1"></i>Pago seguro procesado por Stripe
                </p>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SubscribeComponent {
  auth = inject(AuthService);
  private stripeSvc = inject(StripeService);

  loading = signal(false);
  errorMessage = signal('');

  async subscribe() {
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      await this.stripeSvc.redirectToCheckout(environment.stripe.priceId);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al procesar el pago.');
    } finally {
      this.loading.set(false);
    }
  }
}
