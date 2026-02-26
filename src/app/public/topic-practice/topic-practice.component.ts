import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, take, map } from 'rxjs';
import { PreguntaService } from '../../core/services/pregunta.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { Pregunta } from '../../core/models';

@Component({
  selector: 'app-topic-practice',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div class="container py-4">
      <!-- Loading -->
      @if (loading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-muted mt-2">Cargando preguntas...</p>
        </div>
      }

      <!-- Must register to answer -->
      @if (!loading() && !auth.isLoggedIn() && questions().length > 0) {
        <div class="card border-warning mb-4">
          <div class="card-body text-center py-4">
            <i class="bi bi-lock fs-1 text-warning d-block mb-2"></i>
            <h4>Registrate para practicar</h4>
            <p class="text-muted">Crea una cuenta gratuita para responder preguntas. Tendras 30 preguntas de prueba gratis.</p>
            <div class="d-flex flex-column flex-sm-row justify-content-center gap-2">
              <a routerLink="/registro" class="btn btn-warning btn-lg">
                <i class="bi bi-person-plus me-1"></i> Crear cuenta gratis
              </a>
              <a routerLink="/login" class="btn btn-outline-primary btn-lg">
                <i class="bi bi-box-arrow-in-right me-1"></i> Ya tengo cuenta
              </a>
            </div>
          </div>
        </div>
      }

      <!-- Quota warning for free users -->
      @if (auth.isLoggedIn() && quota.isFree() && quota.quotaMessage()) {
        <div class="alert d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3"
             [ngClass]="quota.remaining() > 5 ? 'alert-info' : quota.remaining() > 0 ? 'alert-warning' : 'alert-danger'">
          <span>
            <i class="bi bi-info-circle me-1"></i>{{ quota.quotaMessage() }}
          </span>
          <a routerLink="/suscripcion" class="btn btn-sm btn-primary text-nowrap">
            <i class="bi bi-star-fill me-1"></i> Desbloquear Premium
          </a>
        </div>
      }

      <!-- Quota exceeded -->
      @if (auth.isLoggedIn() && quotaExceeded()) {
        <div class="card border-primary mb-4">
          <div class="card-body text-center py-4">
            <i class="bi bi-star-fill fs-1 text-primary d-block mb-2"></i>
            <h4>Has agotado tus preguntas gratuitas</h4>
            <p class="text-muted mb-3">
              Suscribete para practicar sin limites y prepararte al maximo para tu examen.
            </p>
            <a routerLink="/suscripcion" class="btn btn-primary btn-lg">
              <i class="bi bi-star-fill me-1"></i> Suscribirme ahora - $99 MXN/mes
            </a>
            <p class="text-muted small mt-2 mb-0">Cancela cuando quieras</p>
          </div>
        </div>
      }

      <!-- No questions -->
      @if (!loading() && questions().length === 0) {
        <div class="card text-center py-5">
          <div class="card-body">
            <i class="bi bi-question-circle fs-1 text-muted d-block mb-2"></i>
            <h5 class="text-muted">No hay preguntas disponibles para este tema.</h5>
            <button class="btn btn-warning mt-3" onclick="history.back()">
              <i class="bi bi-arrow-left me-1"></i> Volver
            </button>
          </div>
        </div>
      }

      <!-- Session finished -->
      @if (sessionFinished() && totalAnswered() > 0) {
        <div class="card text-center py-4 mb-3">
          <div class="card-body">
            <i class="bi bi-trophy fs-1 text-warning d-block mb-2"></i>
            <h4>Has completado todas las preguntas</h4>
            <p class="fs-5 mt-3">
              Resultado: <span class="badge bg-success fs-5">{{ correctCount() }}</span> de <span class="badge bg-secondary fs-5">{{ totalAnswered() }}</span> correctas
            </p>
            <div class="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-3">
              <button class="btn btn-success" (click)="restart()">
                <i class="bi bi-arrow-repeat me-1"></i> Reiniciar
              </button>
              <button class="btn btn-warning" onclick="history.back()">
                <i class="bi bi-arrow-left me-1"></i> Volver
              </button>
            </div>
          </div>
        </div>

        <!-- Upsell after finishing -->
        @if (quota.isFree()) {
          <div class="card border-primary">
            <div class="card-body text-center py-3">
              <h5 class="text-primary mb-2"><i class="bi bi-star-fill me-1"></i> Quieres seguir practicando sin limites?</h5>
              <p class="text-muted small mb-2">Con Premium tendras acceso ilimitado a miles de preguntas con explicaciones detalladas.</p>
              <a routerLink="/suscripcion" class="btn btn-primary">
                Suscribirme por $99 MXN/mes
              </a>
            </div>
          </div>
        }
      }

      <!-- Question card -->
      @if (currentQuestion(); as q) {
        @if (!sessionFinished() && canShowQuestion()) {
          <div class="card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-secondary">
                  <i class="bi bi-hash"></i> {{ currentIndex() + 1 }} / {{ questions().length }}
                </span>
                @if (totalAnswered() > 0) {
                  <span class="badge bg-success">
                    <i class="bi bi-check-circle me-1"></i>{{ correctCount() }} / {{ totalAnswered() }}
                  </span>
                }
              </div>

              <h5 class="mb-4">{{ q.texto }}</h5>

              <div class="d-grid gap-2 mb-4">
                @for (opt of q.opciones; track $index) {
                  <button
                    class="btn text-start py-2 px-3"
                    [ngClass]="optionClass($index)"
                    (click)="selectOption($index)"
                    [disabled]="answered()"
                  >
                    <strong>{{ optionLetter($index) }}.</strong> {{ opt.texto }}
                  </button>
                }
              </div>

              @if (!answered()) {
                <button class="btn btn-success" (click)="submitAnswer()" [disabled]="selectedOption() === null">
                  <i class="bi bi-send me-1"></i> Responder
                </button>
              } @else {
                @if (isCorrect()) {
                  <span class="text-success fw-bold fs-5"><i class="bi bi-check-circle-fill me-1"></i>Correcto!</span>
                } @else {
                  <span class="text-danger fw-bold"><i class="bi bi-x-circle-fill me-1"></i>Incorrecto. La respuesta es {{ correctLetter() }}.</span>
                }
                @if (selectedExplicacion()) {
                  <div class="alert mt-3" [ngClass]="isCorrect() ? 'alert-success' : 'alert-danger'">
                    <i class="bi bi-info-circle me-1"></i> {{ selectedExplicacion() }}
                  </div>
                }
                <div class="text-end mt-3">
                  <button class="btn btn-success" (click)="nextQuestion()">
                    Siguiente <i class="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class TopicPracticeComponent {
  private route = inject(ActivatedRoute);
  private preguntaSvc = inject(PreguntaService);
  auth = inject(AuthService);
  quota = inject(QuotaService);

  questions = signal<Pregunta[]>([]);
  currentIndex = signal(0);
  selectedOption = signal<number | null>(null);
  answered = signal(false);
  loading = signal(true);
  sessionFinished = signal(false);
  correctCount = signal(0);
  totalAnswered = signal(0);

  currentQuestion = computed(() => {
    const qs = this.questions();
    const idx = this.currentIndex();
    return idx < qs.length ? qs[idx] : null;
  });

  canShowQuestion = computed(() => {
    if (!this.auth.isLoggedIn()) return false;
    if (this.quotaExceeded()) return false;
    return true;
  });

  quotaExceeded = computed(() => {
    return this.auth.isLoggedIn() && this.quota.isFree() && !this.quota.canAnswer();
  });

  isCorrect = computed(() => {
    const q = this.currentQuestion();
    const idx = this.selectedOption();
    if (!q || idx === null) return false;
    return q.opciones[idx]?.es_correcta === true;
  });

  correctLetter = computed(() => {
    const q = this.currentQuestion();
    if (!q) return '';
    const ci = q.opciones.findIndex((o) => o.es_correcta);
    return String.fromCharCode(65 + ci);
  });

  selectedExplicacion = computed(() => {
    const q = this.currentQuestion();
    const idx = this.selectedOption();
    if (!q || idx === null) return '';
    return q.opciones[idx]?.explicacion ?? '';
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => p.get('temaId')!),
        switchMap((temaId) => this.preguntaSvc.listByTema(temaId).pipe(take(1))),
      )
      .subscribe((qs) => {
        this.questions.set(this.shuffle(qs));
        this.loading.set(false);
        if (qs.length === 0) this.sessionFinished.set(true);
      });
  }

  selectOption(idx: number) {
    if (!this.answered()) this.selectedOption.set(idx);
  }

  async submitAnswer() {
    if (this.selectedOption() === null || this.answered()) return;
    this.answered.set(true);
    this.totalAnswered.update((n) => n + 1);
    if (this.isCorrect()) this.correctCount.update((n) => n + 1);
    await this.quota.recordAnswer();
  }

  nextQuestion() {
    if (this.quota.isFree() && !this.quota.canAnswer()) {
      this.sessionFinished.set(true);
      return;
    }
    const next = this.currentIndex() + 1;
    if (next < this.questions().length) {
      this.currentIndex.set(next);
      this.selectedOption.set(null);
      this.answered.set(false);
    } else {
      this.sessionFinished.set(true);
    }
  }

  restart() {
    if (this.quota.isFree() && !this.quota.canAnswer()) return;
    this.questions.set(this.shuffle(this.questions()));
    this.currentIndex.set(0);
    this.selectedOption.set(null);
    this.answered.set(false);
    this.sessionFinished.set(false);
    this.correctCount.set(0);
    this.totalAnswered.set(0);
  }

  optionClass(idx: number): string {
    if (!this.answered()) {
      return this.selectedOption() === idx ? 'btn-secondary' : 'btn-outline-secondary';
    }
    const q = this.currentQuestion()!;
    if (q.opciones[idx]?.es_correcta) return 'btn-success';
    if (this.selectedOption() === idx) return 'btn-danger';
    return 'btn-outline-secondary';
  }

  optionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
