import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, take, map, of } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';
import { PreguntaService } from '../../core/services/pregunta.service';
import { ProgresoService } from '../../core/services/progreso.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { Pregunta, Examen, TemaConfig } from '../../core/models';

@Component({
  selector: 'app-exam-simulation',
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
          <p class="text-muted mt-2">Preparando examen simulacion...</p>
        </div>
      }

      <!-- Must register -->
      @if (!loading() && !auth.isLoggedIn()) {
        <div class="card border-warning mb-4">
          <div class="card-body text-center py-4">
            <i class="bi bi-lock fs-1 text-warning d-block mb-2"></i>
            <h4>Registrate para hacer el examen simulacion</h4>
            <div class="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-3">
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

      <!-- No exam access (not paid) -->
      @if (!loading() && auth.isLoggedIn() && !hasAccess()) {
        <div class="card border-primary mb-4">
          <div class="card-body text-center py-4">
            <i class="bi bi-lock-fill fs-1 text-primary d-block mb-2"></i>
            <h4>Acceso restringido</h4>
            @if (quota.isFree()) {
              <p class="text-muted mb-3">
                Necesitas suscribirte a este examen para poder realizar la simulacion.
              </p>
              <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-primary btn-lg">
                <i class="bi bi-star-fill me-1"></i> Suscribirme ahora - $99 MXN/mes
              </a>
              <p class="text-muted small mt-2 mb-0">Cancela cuando quieras</p>
            } @else {
              <p class="text-muted mb-0">No tienes acceso a este examen.</p>
            }
          </div>
        </div>
      }

      <!-- Pre-start screen -->
      @if (!loading() && auth.isLoggedIn() && hasAccess() && !started() && !finished()) {
        <div class="card text-center py-4">
          <div class="card-body">
            <i class="bi bi-clipboard-check fs-1 text-primary d-block mb-2"></i>
            <h3>{{ examen()?.nombre }}</h3>
            <p class="text-muted">{{ questions().length }} preguntas | {{ examen()?.tiempo_limite_minutos }} minutos</p>
            <button class="btn btn-primary btn-lg" (click)="startExam()">
              <i class="bi bi-play-fill me-1"></i> Iniciar Examen
            </button>
          </div>
        </div>
      }

      <!-- Timer + progress bar -->
      @if (started() && !finished()) {
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="badge bg-secondary fs-6">
            <i class="bi bi-hash me-1"></i>{{ currentIndex() + 1 }} / {{ questions().length }}
          </span>
          <span class="badge fs-6" [ngClass]="timeRemaining() < 300 ? 'bg-danger' : 'bg-dark'">
            <i class="bi bi-clock me-1"></i>{{ formattedTime() }}
          </span>
          <span class="badge bg-success fs-6">
            <i class="bi bi-check-circle me-1"></i>{{ correctCount() }} / {{ totalAnswered() }}
          </span>
        </div>

        <div class="progress mb-4" style="height: 6px">
          <div class="progress-bar bg-success" [style.width.%]="progressPercent()"></div>
        </div>
      }

      <!-- Question card during exam -->
      @if (started() && !finished() && currentQuestion(); as q) {
        <div class="card">
          <div class="card-body">
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
                  @if (currentIndex() + 1 < questions().length) {
                    Siguiente <i class="bi bi-arrow-right ms-1"></i>
                  } @else {
                    Finalizar <i class="bi bi-flag-fill ms-1"></i>
                  }
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Results -->
      @if (finished() && totalAnswered() > 0) {
        <div class="card text-center py-4 mb-3">
          <div class="card-body">
            <i class="bi bi-trophy fs-1 text-warning d-block mb-2"></i>
            <h3>Examen Finalizado</h3>
            <p class="fs-5 mt-3">
              Resultado: <span class="badge bg-success fs-4">{{ correctCount() }}</span> de <span class="badge bg-secondary fs-4">{{ totalAnswered() }}</span> correctas
            </p>
            <p class="fs-5">
              Porcentaje: <span class="fw-bold" [ngClass]="scorePercent() >= 60 ? 'text-success' : 'text-danger'">{{ scorePercent() }}%</span>
            </p>
            @if (timeExpired()) {
              <p class="text-danger"><i class="bi bi-alarm me-1"></i>El tiempo se agoto.</p>
            }
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

      }
    </div>
  `,
})
export class ExamSimulationComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private examenSvc = inject(ExamenService);
  private preguntaSvc = inject(PreguntaService);
  private progresoSvc = inject(ProgresoService);
  auth = inject(AuthService);
  quota = inject(QuotaService);

  loading = signal(true);
  started = signal(false);
  finished = signal(false);
  timeExpired = signal(false);
  examen = signal<Examen | null>(null);
  examenId = signal('');
  questions = signal<Pregunta[]>([]);
  currentIndex = signal(0);
  selectedOption = signal<number | null>(null);
  answered = signal(false);
  correctCount = signal(0);
  totalAnswered = signal(0);
  timeRemaining = signal(0);

  hasAccess = computed(() => this.quota.hasExamAccess(this.examenId()));

  private timerId: ReturnType<typeof setInterval> | null = null;

  currentQuestion = computed(() => {
    const qs = this.questions();
    const idx = this.currentIndex();
    return idx < qs.length ? qs[idx] : null;
  });

  progressPercent = computed(() => {
    const total = this.questions().length;
    return total > 0 ? (this.totalAnswered() / total) * 100 : 0;
  });

  scorePercent = computed(() => {
    const total = this.totalAnswered();
    return total > 0 ? Math.round((this.correctCount() / total) * 100) : 0;
  });

  formattedTime = computed(() => {
    const s = this.timeRemaining();
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${mins}:${String(secs).padStart(2, '0')}`;
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
        map((p) => p.get('examenId')!),
        switchMap((examenId) => {
          this.examenId.set(examenId);
          return this.examenSvc.listByEscuela('').pipe(
            take(1),
            switchMap(() =>
              this.examenSvc.list().pipe(
                take(1),
                map((exams) => exams.find((e) => e.id === examenId)),
              ),
            ),
            switchMap((examen) => {
              if (!examen) return of({ examen: null as Examen | null, questions: [] as Pregunta[] });
              return this.examenSvc.listTemasConfig(examenId).pipe(
                take(1),
                switchMap((configs) => {
                  if (configs.length === 0) return of({ examen, questions: [] as Pregunta[] });
                  const temaIds = configs.map((c) => c.tema_id);
                  return this.preguntaSvc.listByTemaIds(temaIds).pipe(
                    take(1),
                    map((allQuestions) => {
                      const selected = this.buildExamQuestions(allQuestions, configs);
                      return { examen, questions: selected };
                    }),
                  );
                }),
              );
            }),
          );
        }),
      )
      .subscribe(({ examen, questions }) => {
        this.examen.set(examen);
        this.questions.set(this.shuffle(questions));
        this.timeRemaining.set((examen?.tiempo_limite_minutos ?? 120) * 60);
        this.loading.set(false);
      });
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  startExam() {
    this.started.set(true);
    this.startTimer();
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
      this.finishExam();
    }
  }

  restart() {
    this.stopTimer();
    this.questions.set(this.shuffle(this.questions()));
    this.currentIndex.set(0);
    this.selectedOption.set(null);
    this.answered.set(false);
    this.finished.set(false);
    this.timeExpired.set(false);
    this.correctCount.set(0);
    this.totalAnswered.set(0);
    this.started.set(false);
    this.timeRemaining.set((this.examen()?.tiempo_limite_minutos ?? 120) * 60);
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

  private buildExamQuestions(allQuestions: Pregunta[], configs: TemaConfig[]): Pregunta[] {
    const result: Pregunta[] = [];
    for (const cfg of configs) {
      let pool = allQuestions.filter((q) => q.tema_id === cfg.tema_id);
      if (cfg.dificultades && cfg.dificultades.length > 0) {
        pool = pool.filter((q) => cfg.dificultades.includes(q.dificultad));
      }
      const shuffled = this.shuffle(pool);
      result.push(...shuffled.slice(0, cfg.num_reactivos));
    }
    return result;
  }

  private startTimer() {
    this.timerId = setInterval(() => {
      this.timeRemaining.update((t) => {
        if (t <= 1) {
          this.timeExpired.set(true);
          this.finishExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  private stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private finishExam() {
    this.stopTimer();
    this.finished.set(true);
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
