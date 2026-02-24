import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { StripeService } from '../../core/services/stripe.service';
import { ExamenService } from '../../core/services/examen.service';
import { environment } from '../../../environments/environment';
import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { Examen } from '../../core/models';

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <div class="container py-5">

      <!-- ===== STEP 1: CHOOSE EXAM ===== -->
      @if (!checkoutActive() && !selectedExamen()) {
        <div class="text-center mb-4">
          <img src="logo.png" alt="Estudiar es barato" class="mb-3" style="width: 80px; height: 80px;">
          <h1 class="h2">Elige el examen que quieres practicar</h1>
          <p class="text-muted">Cada examen se paga por separado. Selecciona el que vas a presentar.</p>
        </div>

        @if (loadingExams()) {
          <div class="text-center py-5">
            <div class="spinner-border text-primary"></div>
          </div>
        } @else {
          <div class="row g-3 justify-content-center">
            @for (ex of examenesList(); track ex.id) {
              <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <div
                  class="card h-100 text-center exam-card"
                  [ngClass]="isExamPaid(ex.id!) ? 'border-success' : 'border-0 shadow-sm'"
                  style="cursor: pointer;"
                  (click)="selectExam(ex)"
                >
                  <div class="card-body d-flex flex-column align-items-center justify-content-center p-3">
                    @if (isExamPaid(ex.id!)) {
                      <span class="badge bg-success mb-2"><i class="bi bi-check-circle me-1"></i>Ya pagado</span>
                    }
                    <i class="bi bi-file-earmark-text fs-1 mb-2 text-primary"></i>
                    <h6 class="card-title mb-1">{{ ex.escuela }}</h6>
                    <p class="text-muted small mb-1">{{ ex.nombre }} - {{ ex.area }}</p>
                    <p class="text-muted small mb-0">{{ ex.total_reactivos }} reactivos</p>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="col-12 text-center text-muted py-5">
                <p>No hay examenes disponibles.</p>
              </div>
            }
          </div>
        }
      }

      <!-- ===== STEP 2: PAYMENT CARD ===== -->
      @if (!checkoutActive() && selectedExamen(); as ex) {
        <div class="text-center mb-4">
          <button class="btn btn-outline-secondary btn-sm mb-3" (click)="clearSelection()">
            <i class="bi bi-arrow-left me-1"></i> Elegir otro examen
          </button>
          <h1 class="h2">Suscribete: {{ ex.nombre }} - {{ ex.area }}</h1>
          <p class="text-muted">{{ ex.escuela }} | {{ ex.total_reactivos }} reactivos</p>
        </div>

        @if (isExamPaid(ex.id!)) {
          <div class="row justify-content-center">
            <div class="col-12 col-sm-10 col-md-6 col-lg-5">
              <div class="card border-success text-center py-4">
                <div class="card-body">
                  <i class="bi bi-check-circle-fill fs-1 text-success d-block mb-2"></i>
                  <h4>Ya tienes acceso a este examen</h4>
                  <p class="text-muted">Puedes practicar todas las materias de este examen sin limite.</p>
                  <a routerLink="/explore" class="btn btn-success">
                    <i class="bi bi-play-fill me-1"></i> Ir a practicar
                  </a>
                </div>
              </div>
            </div>
          </div>
        } @else {
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
                      <i class="bi bi-check-circle-fill text-success me-2"></i>Acceso a todas las materias del examen
                    </li>
                    <li class="py-2 border-bottom">
                      <i class="bi bi-check-circle-fill text-success me-2"></i>Miles de preguntas con explicacion
                    </li>
                    <li class="py-2 border-bottom">
                      <i class="bi bi-check-circle-fill text-success me-2"></i>Practica ilimitada
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
                      Ya tienes cuenta? <a routerLink="/login" class="fw-bold">Inicia sesion</a>
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
      }

      <!-- ===== EMBEDDED CHECKOUT FORM ===== -->
      @if (checkoutActive()) {
        <div class="row justify-content-center">
          <div class="col-12 col-lg-8">
            <div class="text-center mb-3">
              <h3>Completa tu pago</h3>
              <p class="text-muted">Ingresa los datos de tu tarjeta para activar tu suscripcion.</p>
            </div>
            <div #checkoutContainer></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .exam-card { transition: transform 0.2s, box-shadow 0.2s; }
    .exam-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
  `],
})
export class SubscribeComponent implements OnDestroy {
  auth = inject(AuthService);
  private stripeSvc = inject(StripeService);
  private examenSvc = inject(ExamenService);
  private route = inject(ActivatedRoute);

  @ViewChild('checkoutContainer') checkoutContainer!: ElementRef<HTMLDivElement>;

  loading = signal(false);
  loadingExams = signal(true);
  errorMessage = signal('');
  checkoutActive = signal(false);
  selectedExamen = signal<Examen | null>(null);

  private allExamenes = signal<Examen[]>([]);

  /** De-duplicate exams by escuela+nombre+area */
  examenesList = computed(() => {
    const seen = new Map<string, Examen>();
    for (const ex of this.allExamenes()) {
      const key = `${ex.escuela}|${ex.nombre}|${ex.area}`;
      if (!seen.has(key)) seen.set(key, ex);
    }
    return [...seen.values()];
  });

  private checkout: StripeEmbeddedCheckout | null = null;

  constructor() {
    this.examenSvc.list().subscribe((exs) => {
      this.allExamenes.set(exs);
      this.loadingExams.set(false);

      // Pre-select exam if passed via query param
      const qp = this.route.snapshot.queryParamMap.get('examenId');
      if (qp) {
        const match = exs.find((e) => e.id === qp);
        if (match) this.selectedExamen.set(match);
      }
    });
  }

  isExamPaid(examenId: string): boolean {
    const p = this.auth.profile();
    return p?.examenes_pagados?.includes(examenId) ?? false;
  }

  selectExam(ex: Examen) {
    this.selectedExamen.set(ex);
    this.errorMessage.set('');
  }

  clearSelection() {
    this.selectedExamen.set(null);
    this.errorMessage.set('');
  }

  async subscribe() {
    const ex = this.selectedExamen();
    if (!ex) return;

    this.errorMessage.set('');
    this.loading.set(true);

    try {
      const clientSecret = await this.stripeSvc.createEmbeddedCheckout(
        environment.stripe.priceId,
        ex.id!,
        `${ex.escuela} - ${ex.nombre} (${ex.area})`,
      );

      const stripe = await loadStripe(environment.stripe.publishableKey);
      if (!stripe) throw new Error('Error cargando Stripe');

      this.checkoutActive.set(true);
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
