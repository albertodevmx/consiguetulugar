import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, take } from 'rxjs';
import { QuestionService } from '../../core/services/question.service';
import { TopicService } from '../../core/services/topic.service';
import { Question } from '../../core/models';

@Component({
  selector: 'app-topic-practice',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="container py-4">
      @if (topicName(); as name) {
        <h2 class="mb-4"><i class="bi bi-pencil-square me-2"></i>{{ name }}</h2>
      }

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
            <h5 class="text-muted">No hay preguntas disponibles para este tema.</h5>
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

              @if (q.imageUrl) {
                <div class="text-center mb-3">
                  <img [src]="q.imageUrl" alt="Imagen" class="img-fluid rounded" style="max-height: 300px">
                </div>
              }

              <h5 class="mb-4">{{ q.text }}</h5>

              <div class="d-grid gap-2 mb-4">
                @for (opt of q.options; track $index) {
                  <button
                    class="btn text-start py-2 px-3"
                    [ngClass]="optionClass($index, q.correctOption)"
                    (click)="selectOption($index)"
                    [disabled]="answered()"
                  >
                    <strong>{{ optionLetter($index) }}.</strong> {{ opt.text }}
                  </button>
                }
              </div>

              @if (!answered()) {
                <button class="btn btn-success" (click)="submitAnswer()" [disabled]="selectedOption() === null">
                  <i class="bi bi-send me-1"></i> Responder
                </button>
              } @else {
                @if (selectedOption() === q.correctOption) {
                  <span class="text-success fw-bold fs-5"><i class="bi bi-check-circle-fill me-1"></i>Correcto!</span>
                } @else {
                  <span class="text-danger fw-bold"><i class="bi bi-x-circle-fill me-1"></i>Incorrecto. La respuesta es {{ optionLetter(q.correctOption) }}.</span>
                }
                @if (selectedFeedback()) {
                  <div class="alert mt-3" [ngClass]="selectedOption() === q.correctOption ? 'alert-success' : 'alert-danger'">
                    <i class="bi bi-info-circle me-1"></i> {{ selectedFeedback() }}
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
  private questionSvc = inject(QuestionService);
  private topicSvc = inject(TopicService);

  private topicId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('topicId')!)),
    { initialValue: '' },
  );

  private topics = toSignal(this.topicSvc.list(), { initialValue: [] });
  topicName = computed(() => this.topics().find((t) => t.id === this.topicId())?.name ?? '');

  questions = signal<Question[]>([]);
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

  constructor() {
    this.route.paramMap
      .pipe(
        map((p) => p.get('topicId')!),
        switchMap((id) => {
          this.resetQuiz();
          this.loading.set(true);
          return this.questionSvc.listByTopic(id).pipe(take(1));
        }),
      )
      .subscribe((qs) => {
        const active = qs.filter((q) => q.active);
        this.questions.set(this.shuffle(active));
        this.loading.set(false);
        if (active.length === 0) this.sessionFinished.set(true);
      });
  }

  selectOption(idx: number) {
    if (!this.answered()) this.selectedOption.set(idx);
  }

  submitAnswer() {
    if (this.selectedOption() === null || this.answered()) return;
    this.answered.set(true);
    this.totalAnswered.update((n) => n + 1);
    const q = this.currentQuestion();
    if (q && this.selectedOption() === q.correctOption) {
      this.correctCount.update((n) => n + 1);
    }
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

  selectedFeedback(): string {
    const q = this.currentQuestion();
    const idx = this.selectedOption();
    if (!q || idx === null) return '';
    return q.options[idx]?.feedback ?? '';
  }

  optionClass(idx: number, correctIdx: number): string {
    if (!this.answered()) {
      return this.selectedOption() === idx ? 'btn-secondary' : 'btn-outline-secondary';
    }
    if (idx === correctIdx) return 'btn-success';
    if (this.selectedOption() === idx) return 'btn-danger';
    return 'btn-outline-secondary';
  }

  optionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  private resetQuiz() {
    this.questions.set([]);
    this.currentIndex.set(0);
    this.selectedOption.set(null);
    this.answered.set(false);
    this.sessionFinished.set(false);
    this.correctCount.set(0);
    this.totalAnswered.set(0);
    this.loading.set(false);
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
