import { Component, inject, signal, computed } from '@angular/core';
import { NgClass, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, take, map } from 'rxjs';
import { PreguntaService } from '../../core/services/pregunta.service';
import { ExamenService } from '../../core/services/examen.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { Pregunta, TemaConfig } from '../../core/models';

@Component({
  selector: 'app-topic-practice',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div class="container py-4">
      <button class="btn btn-warning btn-sm mb-3" (click)="goBack()">
        <i class="bi bi-arrow-left me-1"></i> Volver
      </button>

      <!-- Loading -->
      @if (loading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="text-muted mt-2">Cargando preguntas...</p>
        </div>
      }

      <!-- Locked: needs subscription -->
      @if (!loading() && access() === 'locked') {
        <div class="card border-primary mb-4">
          <div class="card-body text-center py-4">
            <i class="bi bi-lock-fill fs-1 text-primary d-block mb-2"></i>
            <h4>Acceso restringido</h4>
            <p class="text-muted mb-3">
              Suscribete para practicar todos los temas, con preguntas ilimitadas y simulacros de examen.
            </p>
            <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-primary btn-lg">
              <i class="bi bi-star-fill me-1"></i> Suscribirme - $99 MXN/mes
            </a>
            <p class="text-muted small mt-2 mb-0">Cancela cuando quieras</p>
          </div>
        </div>
      }

      <!-- Free topic but not logged in: must register -->
      @if (!loading() && access() === 'free' && !auth.isLoggedIn() && questions().length > 0) {
        <div class="card border-success mb-4">
          <div class="card-body text-center py-4">
            <i class="bi bi-person-plus fs-1 text-success d-block mb-2"></i>
            <h4>Registrate para practicar</h4>
            <p class="text-muted">Este tema es gratuito. Crea tu cuenta para empezar a resolver preguntas.</p>
            <div class="d-flex flex-column flex-sm-row justify-content-center gap-2">
              <a routerLink="/registro" class="btn btn-success btn-lg">
                <i class="bi bi-person-plus me-1"></i> Crear cuenta gratis
              </a>
              <a routerLink="/login" class="btn btn-outline-primary btn-lg">
                <i class="bi bi-box-arrow-in-right me-1"></i> Ya tengo cuenta
              </a>
            </div>
          </div>
        </div>
      }

      <!-- No questions -->
      @if (!loading() && questions().length === 0) {
        <div class="card text-center py-5">
          <div class="card-body">
            <i class="bi bi-question-circle fs-1 text-muted d-block mb-2"></i>
            <h5 class="text-muted">No hay preguntas disponibles para este tema.</h5>
            <button class="btn btn-warning mt-3" (click)="goBack()">
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
              <button class="btn btn-warning" (click)="goBack()">
                <i class="bi bi-arrow-left me-1"></i> Volver
              </button>
            </div>
          </div>
        </div>

        <!-- Upsell after finishing (free-tier users) -->
        @if (quota.isFree()) {
          <div class="card border-primary">
            <div class="card-body text-center py-3">
              <h5 class="text-primary mb-2"><i class="bi bi-star-fill me-1"></i> Desbloquea todos los temas</h5>
              <p class="text-muted small mb-2">Suscribete para practicar todas las materias sin limites y hacer simulacros completos.</p>
              <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-primary">
                Suscribirme - $99 MXN/mes
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
  private location = inject(Location);
  private preguntaSvc = inject(PreguntaService);
  private examenSvc = inject(ExamenService);
  auth = inject(AuthService);
  quota = inject(QuotaService);

  private examenIdValue = signal('');
  private temasConfig = signal<TemaConfig[]>([]);

  questions = signal<Pregunta[]>([]);
  currentIndex = signal(0);
  selectedOption = signal<number | null>(null);
  answered = signal(false);
  loading = signal(true);
  sessionFinished = signal(false);
  correctCount = signal(0);
  totalAnswered = signal(0);

  examenId = this.examenIdValue.asReadonly();

  /** Access level for this topic: 'free', 'paid', or 'locked' */
  access = computed(() => {
    const eid = this.examenIdValue();
    if (!eid) return 'locked' as const;
    const temaId = this.route.snapshot.paramMap.get('temaId') ?? '';
    return this.quota.getTemaAccess(temaId, eid, this.temasConfig());
  });

  currentQuestion = computed(() => {
    const qs = this.questions();
    const idx = this.currentIndex();
    return idx < qs.length ? qs[idx] : null;
  });

  canShowQuestion = computed(() => {
    if (!this.auth.isLoggedIn()) return false;
    const a = this.access();
    return a === 'free' || a === 'paid';
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
    const qp = this.route.snapshot.queryParamMap.get('examenId');
    if (qp) this.examenIdValue.set(qp);

    // Load TemaConfig for access check
    if (qp) {
      this.examenSvc.listTemasConfig(qp).pipe(take(1)).subscribe((configs) => {
        this.temasConfig.set(configs);
      });
    }

    // Load questions
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

  submitAnswer() {
    if (this.selectedOption() === null || this.answered()) return;
    this.answered.set(true);
    this.totalAnswered.update((n) => n + 1);
    if (this.isCorrect()) this.correctCount.update((n) => n + 1);
  }

  nextQuestion() {
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

  goBack() {
    this.location.back();
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
