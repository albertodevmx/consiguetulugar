import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { PreguntaService } from '../../core/services/pregunta.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { Pregunta } from '../../core/models';

@Component({
  selector: 'app-quick-practice',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './quick-practice.component.html',
})
export class QuickPracticeComponent {
  private preguntaSvc = inject(PreguntaService);
  auth = inject(AuthService);
  quota = inject(QuotaService);

  pool = signal<Pregunta[]>([]);
  currentIndex = signal(0);
  selectedOption = signal<number | null>(null);
  answered = signal(false);
  loading = signal(true);
  correctCount = signal(0);
  totalAnswered = signal(0);

  /** Quick practice requires a paid subscription */
  hasPaidAccess = computed(() => {
    const p = this.auth.profile();
    if (!p) return false;
    return (p.examenes_pagados?.length ?? 0) > 0;
  });

  currentQuestion = computed(() => {
    const p = this.pool();
    const idx = this.currentIndex();
    return idx < p.length ? p[idx] : null;
  });

  canShowQuestion = computed(() => {
    if (!this.auth.isLoggedIn()) return false;
    if (!this.hasPaidAccess()) return false;
    return true;
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
    this.loadAll();
  }

  private loadAll() {
    this.loading.set(true);
    this.preguntaSvc
      .listAll(100)
      .pipe(take(1))
      .subscribe((qs) => {
        this.pool.set(this.shuffle(qs));
        this.loading.set(false);
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
    if (next < this.pool().length) {
      this.currentIndex.set(next);
    } else {
      this.pool.set(this.shuffle(this.pool()));
      this.currentIndex.set(0);
    }
    this.selectedOption.set(null);
    this.answered.set(false);
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
