import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { TemaConfig } from '../models';

/** How many topics of the free section are available as trial */
const FREE_TOPIC_COUNT = 3;
/** Which section gets the free trial topics */
const FREE_SECTION = 'Español';

@Injectable({ providedIn: 'root' })
export class QuotaService {
  private auth = inject(AuthService);

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

  /**
   * Given the TemaConfig list for an exam, returns the set of tema_ids
   * that are available as free trial content (first N topics of Español).
   */
  getFreeTemaIds(configs: TemaConfig[]): Set<string> {
    const sectionTopics = configs
      .filter(c => c.seccion === FREE_SECTION)
      .sort((a, b) => a.orden - b.orden)
      .slice(0, FREE_TOPIC_COUNT);
    return new Set(sectionTopics.map(c => c.tema_id));
  }

  /**
   * Determine access level for a specific topic within an exam.
   * Returns:
   *  - 'free'   → topic is part of the free trial (anyone can view lesson, registered can practice)
   *  - 'paid'   → user has paid for this exam, full access
   *  - 'locked' → user needs to subscribe
   */
  getTemaAccess(temaId: string, examenId: string, configs: TemaConfig[]): 'free' | 'paid' | 'locked' {
    const freeIds = this.getFreeTemaIds(configs);
    if (freeIds.has(temaId)) return 'free';
    if (this.hasExamAccess(examenId)) return 'paid';
    return 'locked';
  }
}
