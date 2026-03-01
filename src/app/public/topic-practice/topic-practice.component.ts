import { Component, inject, signal, computed } from '@angular/core';
import { NgClass, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, take, map, combineLatest, of } from 'rxjs';
import { PreguntaService } from '../../core/services/pregunta.service';
import { ExamenService } from '../../core/services/examen.service';
import { ProgresoService } from '../../core/services/progreso.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { Pregunta, TemaConfig } from '../../core/models';

/** Max questions shown in free trial practice */
const FREE_QUESTION_LIMIT = 10;

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
            @if (quota.isFree()) {
              <p class="text-muted mb-3">
                Suscribete para practicar todos los temas, con preguntas ilimitadas y simulacros de examen.
              </p>
              <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-primary btn-lg">
                <i class="bi bi-star-fill me-1"></i> Suscribirme - $99 MXN/mes
              </a>
              <p class="text-muted small mt-2 mb-0">Cancela cuando quieras</p>
            } @else {
              <p class="text-muted mb-0">No tienes acceso a este tema.</p>
            }
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
            @if (isTrial()) {
              <p class="text-muted mt-2 mb-0">
                <i class="bi bi-info-circle me-1"></i>
                Estas fueron solo {{ questions().length }} preguntas de muestra de las {{ totalQuestionsInTema() }} disponibles en este tema.
              </p>
            }
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

      <!-- Trial mode banner -->
      @if (isTrial() && !sessionFinished() && canShowQuestion()) {
        <div class="alert alert-info d-flex align-items-start mb-3" role="alert">
          <i class="bi bi-info-circle-fill me-2 mt-1"></i>
          <div>
            <strong>Modo de prueba.</strong>
            Este tema tiene {{ totalQuestionsInTema() }} preguntas.
            Estas {{ questions().length }} son solo de muestra.
            <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="alert-link">
              Suscribete para practicar todas.
            </a>
          </div>
        </div>
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
  private progresoSvc = inject(ProgresoService);
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
  private _allQuestions = signal<Pregunta[]>([]);
  totalQuestionsInTema = computed(() => this._allQuestions().length);

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

  /** True when user is on free plan and there are more questions than the trial limit */
  isTrial = computed(() => this.access() === 'free' && this._allQuestions().length > FREE_QUESTION_LIMIT);

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

  private falladasSet = new Set<string>();

  constructor() {
    const qp = this.route.snapshot.queryParamMap.get('examenId');
    if (qp) this.examenIdValue.set(qp);

    const temaId = this.route.snapshot.paramMap.get('temaId')!;

    const questions$ = this.route.paramMap.pipe(
      map((p) => p.get('temaId')!),
      switchMap((tid) => this.preguntaSvc.listByTema(tid).pipe(take(1))),
    );

    const configs$ = qp
      ? this.examenSvc.listTemasConfig(qp).pipe(take(1))
      : of([] as TemaConfig[]);

    // Wait for both questions and config so access() is accurate
    combineLatest([questions$, configs$]).subscribe(async ([qs, configs]) => {
      this.temasConfig.set(configs);

      // Load user's progress to prioritize failed questions
      const progreso = await this.progresoSvc.getProgreso(temaId);
      if (progreso?.falladas?.length) {
        this.falladasSet = new Set(progreso.falladas);
      }

      // Sort deterministically by id so free-trial always shows the same questions
      const sorted = [...qs].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
      this._allQuestions.set(sorted);

      if (this.access() === 'free') {
        this.questions.set(sorted.slice(0, FREE_QUESTION_LIMIT));
      } else {
        this.questions.set(this.prioritize(sorted));
      }

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
    const correct = this.isCorrect();
    if (correct) this.correctCount.update((n) => n + 1);

    const q = this.currentQuestion();
    if (q) this.progresoSvc.recordAnswer(q, correct);
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
    if (this.access() === 'free') {
      // Trial: same questions, same order
      this.questions.set(this._allQuestions().slice(0, FREE_QUESTION_LIMIT));
    } else {
      this.questions.set(this.prioritize(this._allQuestions()));
    }
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

  /** Put previously-failed questions first, then shuffle the rest */
  private prioritize(all: Pregunta[]): Pregunta[] {
    if (this.falladasSet.size === 0) return this.shuffle(all);
    const failed = all.filter((q) => this.falladasSet.has(q.id!));
    const rest = all.filter((q) => !this.falladasSet.has(q.id!));
    return [...this.shuffle(failed), ...this.shuffle(rest)];
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
