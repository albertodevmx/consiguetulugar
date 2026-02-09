import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { QuestionService } from '../../core/services/question.service';
import { Question } from '../../core/models';

@Component({
  selector: 'app-quick-practice',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './quick-practice.component.html',
})
export class QuickPracticeComponent {
  private questionSvc = inject(QuestionService);

  /* ── state ── */
  pool = signal<Question[]>([]);
  currentIndex = signal(0);
  selectedOption = signal<number | null>(null);
  answered = signal(false);
  loading = signal(true);
  correctCount = signal(0);
  totalAnswered = signal(0);

  currentQuestion = computed(() => {
    const p = this.pool();
    const idx = this.currentIndex();
    return idx < p.length ? p[idx] : null;
  });

  constructor() {
    this.loadAll();
  }

  /* ── load all active questions and shuffle ── */
  private loadAll() {
    this.loading.set(true);
    this.questionSvc
      .list()
      .pipe(take(1))
      .subscribe((qs) => {
        const active = qs.filter((q) => q.active);
        this.pool.set(this.shuffle(active));
        this.loading.set(false);
      });
  }

  /* ── user actions ── */
  selectOption(idx: number) {
    if (!this.answered()) {
      this.selectedOption.set(idx);
    }
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
    if (next < this.pool().length) {
      this.currentIndex.set(next);
    } else {
      // Reshuffle and loop back to start (infinite)
      this.pool.set(this.shuffle(this.pool()));
      this.currentIndex.set(0);
    }
    this.selectedOption.set(null);
    this.answered.set(false);
  }

  /* ── helpers ── */
  selectedFeedback(): string {
    const q = this.currentQuestion();
    const idx = this.selectedOption();
    if (!q || idx === null) return '';
    return q.options[idx]?.feedback ?? '';
  }

  optionClass(idx: number, correctIdx: number): string {
    if (!this.answered()) {
      return this.selectedOption() === idx
        ? 'btn-secondary'
        : 'btn-outline-secondary';
    }
    if (idx === correctIdx) return 'btn-success';
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
