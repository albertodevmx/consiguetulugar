import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const WEEKLY_LIMIT = 30;

@Injectable({ providedIn: 'root' })
export class QuotaService {
  private auth = inject(AuthService);

  /** Monday of the current week as YYYY-MM-DD */
  private currentWeekStart(): string {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const diff = day === 0 ? 6 : day - 1; // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return monday.toISOString().slice(0, 10);
  }

  /** Whether the user is on a free plan */
  isFree = computed(() => {
    const p = this.auth.profile();
    return !p || p.plan === 'gratuito';
  });

  /** Whether user has paid for a specific exam */
  hasExamAccess(examenId: string): boolean {
    const p = this.auth.profile();
    if (!p) return false;
    return p.examenes_pagados?.includes(examenId) ?? false;
  }

  /** Get remaining questions for free users this week */
  remaining = computed(() => {
    // If profile hasn't loaded yet, allow answering (don't block on loading)
    if (!this.auth.profileLoaded()) return WEEKLY_LIMIT;
    const p = this.auth.profile();
    if (!p) return WEEKLY_LIMIT;
    if (!this.isFree()) return Infinity;

    const weekStart = this.currentWeekStart();
    const usedThisWeek = (p.fecha_inicio_semana === weekStart)
      ? (p.preguntas_semana ?? 0)
      : 0; // New week → reset

    return Math.max(0, WEEKLY_LIMIT - usedThisWeek);
  });

  /** Whether the user can answer another question */
  canAnswer = computed(() => {
    if (!this.auth.isLoggedIn()) return false;
    if (!this.isFree()) return true;
    return this.remaining() > 0;
  });

  /** Record that the user answered a question */
  async recordAnswer(): Promise<void> {
    const p = this.auth.profile();
    if (!p || !this.auth.isLoggedIn()) return;
    if (!this.isFree()) return;

    const weekStart = this.currentWeekStart();
    const isNewWeek = (p.fecha_inicio_semana ?? '') !== weekStart;

    await this.auth.updateProfile({
      preguntas_semana: isNewWeek ? 1 : (p.preguntas_semana ?? 0) + 1,
      fecha_inicio_semana: weekStart,
    });
  }

  /** Get a human-readable quota status */
  quotaMessage = computed(() => {
    const p = this.auth.profile();
    if (!p) return '';
    if (!this.isFree()) return '';

    const rem = this.remaining();
    if (rem > 0) {
      return `Te quedan ${rem} preguntas gratuitas esta semana.`;
    }
    return 'Has alcanzado tu limite semanal de preguntas gratuitas.';
  });
}
