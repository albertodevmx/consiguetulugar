import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap, take, map } from 'rxjs';
import { PreguntaService } from '../../core/services/pregunta.service';
import { Pregunta } from '../../core/models';

@Component({
  selector: 'app-topic-practice',
  standalone: true,
  imports: [NgClass],
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

      <!-- No questions -->
      @if (!loading() && questions().length === 0) {
        <div class="card text-center py-5">
          <div class="card-body">
            <i class="bi bi-question-circle fs-1 text-muted d-block mb-2"></i>
            <h5 class="text-muted">No hay preguntas disponibles para esta unidad.</h5>
            <button class="btn btn-warning mt-3" onclick="history.back()">
              <i class="bi bi-arrow-left me-1"></i> Volver
            </button>
          </div>
        </div>
      }

      <!-- Session finished -->
      @if (sessionFinished() && totalAnswered() > 0) {
        <div class="card text-center py-4">
          <div class="card-body">
            <i class="bi bi-trophy fs-1 text-warning d-block mb-2"></i>
            <h4>Has completado todas las preguntas</h4>
            <p class="fs-5 mt-3">
              Resultado: <span class="badge bg-success fs-5">{{ correctCount() }}</span> de <span class="badge bg-secondary fs-5">{{ totalAnswered() }}</span> correctas
            </p>
            <div class="d-flex justify-content-center gap-3 mt-3">
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

      <!-- Question card -->
      @if (currentQuestion(); as q) {
        @if (!sessionFinished()) {
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

              @if (q.imagen_url) {
                <div class="text-center mb-3">
                  <img [src]="q.imagen_url" [alt]="q.imagen_descripcion || 'Imagen'" class="img-fluid rounded" style="max-height: 300px">
                </div>
              }

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

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
