import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StripeService } from '../../core/services/stripe.service';
import { environment } from '../../../environments/environment';
import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-5">

      <!-- ===== PRICING CARD (hidden once checkout is active) ===== -->
      @if (!checkoutActive()) {
        <div class="text-center mb-4">
          <img src="logo.png" alt="Estudiar es barato" class="mb-3" style="width: 80px; height: 80px;">
          <h1>Suscr\u00edbete a Estudiar es barato</h1>
          <p class="text-muted fs-5">Accede a todo el material de estudio con una suscripci\u00f3n mensual.</p>
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
                    <i class="bi bi-check-circle-fill text-success me-2"></i>Miles de preguntas con explicaci\u00f3n
                  </li>
                  <li class="py-2 border-bottom">
                    <i class="bi bi-check-circle-fill text-success me-2"></i>Seguimiento de tu progreso
                  </li>
                  <li class="py-2 border-bottom">
                    <i class="bi bi-check-circle-fill text-success me-2"></i>Pr\u00e1ctica ilimitada
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
                    \u00bfYa tienes cuenta? <a routerLink="/login" class="fw-bold">Inicia sesi\u00f3n</a>
                  </p>
                } @else {
                  <button
                    class="btn btn-primary btn-lg w-100 py-2"
                    (click)="subscribe()"
                    [disabled]="loading()"
                  >
                    @if (loading()) {
                      <span class="spinner-border spinner-border-sm me-1"></span> Preparando...
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
      }

      <!-- ===== EMBEDDED CHECKOUT FORM ===== -->
      @if (checkoutActive()) {
        <div class="row justify-content-center">
          <div class="col-12 col-lg-8">
            <div class="text-center mb-3">
              <h3>Completa tu pago</h3>
              <p class="text-muted">Ingresa los datos de tu tarjeta para activar tu suscripci\u00f3n.</p>
            </div>
            <div #checkoutContainer></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SubscribeComponent implements OnDestroy {
  auth = inject(AuthService);
  private stripeSvc = inject(StripeService);

  @ViewChild('checkoutContainer') checkoutContainer!: ElementRef<HTMLDivElement>;

  loading = signal(false);
  errorMessage = signal('');
  checkoutActive = signal(false);

  private checkout: StripeEmbeddedCheckout | null = null;

  async subscribe() {
    this.errorMessage.set('');
    this.loading.set(true);

    try {
      const clientSecret = await this.stripeSvc.createEmbeddedCheckout(
        environment.stripe.priceId,
      );

      const stripe = await loadStripe(environment.stripe.publishableKey);
      if (!stripe) throw new Error('Error cargando Stripe');

      this.checkoutActive.set(true);

      // Wait for Angular to render the container div
      await new Promise((r) => setTimeout(r, 0));

      this.checkout = await stripe.initEmbeddedCheckout({ clientSecret });
      this.checkout.mount(this.checkoutContainer.nativeElement);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Error al procesar el pago.');
      this.checkoutActive.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.checkout?.destroy();
  }
}
