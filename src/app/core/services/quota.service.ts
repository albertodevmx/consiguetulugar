import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const FIRST_TIME_LIMIT = 30;
const DAILY_LIMIT = 10;

@Injectable({ providedIn: 'root' })
export class QuotaService {
  private auth = inject(AuthService);

  private today(): string {
    return new Date().toISOString().slice(0, 10);
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
    if (p.plan === 'premium' && p.examenes_pagados?.length === 0) return true;
    return p.examenes_pagados?.includes(examenId) ?? false;
  }

  /** Get remaining questions for free users */
  remaining = computed(() => {
    const p = this.auth.profile();
    if (!p) return 0;
    if (!this.isFree()) return Infinity;

    const total = p.preguntas_respondidas ?? 0;
    const hoy = p.preguntas_hoy ?? 0;
    const fechaHoy = p.fecha_preguntas_hoy ?? '';

    // First 30 questions are free (lifetime)
    if (total < FIRST_TIME_LIMIT) {
      return FIRST_TIME_LIMIT - total;
    }

    // After that, 10 per day
    if (fechaHoy !== this.today()) {
      return DAILY_LIMIT; // New day, full quota
    }

    return Math.max(0, DAILY_LIMIT - hoy);
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
    if (!this.isFree()) return; // Premium users don't need tracking

    const hoy = this.today();
    const isNewDay = (p.fecha_preguntas_hoy ?? '') !== hoy;

    await this.auth.updateProfile({
      preguntas_respondidas: (p.preguntas_respondidas ?? 0) + 1,
      preguntas_hoy: isNewDay ? 1 : (p.preguntas_hoy ?? 0) + 1,
      fecha_preguntas_hoy: hoy,
    });
  }

  /** Get a human-readable quota status */
  quotaMessage = computed(() => {
    const p = this.auth.profile();
    if (!p) return '';
    if (!this.isFree()) return '';

    const total = p.preguntas_respondidas ?? 0;
    const rem = this.remaining();

    if (total < FIRST_TIME_LIMIT) {
      return `Te quedan ${rem} preguntas de prueba gratuitas.`;
    }
    if (rem > 0) {
      return `Te quedan ${rem} preguntas gratuitas hoy.`;
    }
    return 'Has alcanzado tu limite diario de preguntas gratuitas.';
  });
}
