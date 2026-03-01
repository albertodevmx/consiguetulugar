import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, of } from 'rxjs';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Tema } from '../../core/models';
import { ExamenService } from '../../core/services/examen.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';

@Component({
  selector: 'app-topic-lesson',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <button class="btn btn-warning btn-sm mb-3" onclick="history.back()">
        <i class="bi bi-arrow-left me-1"></i> Volver
      </button>

      <!-- Loading -->
      @if (!tema()) {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else if (access() === 'locked') {
        <!-- Locked content: requires subscription -->
        <div class="card border-primary mb-4">
          <div class="card-body text-center py-5">
            <i class="bi bi-lock-fill fs-1 text-primary d-block mb-3"></i>
            <h4>Este contenido requiere suscripcion</h4>
            <p class="text-muted mb-3">
              Suscribete para acceder a todas las lecciones, practica ilimitada y simulacros de examen.
            </p>
            <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-primary btn-lg">
              <i class="bi bi-star-fill me-1"></i> Suscribirme - $99 MXN/mes
            </a>
            <p class="text-muted small mt-2 mb-0">Cancela cuando quieras</p>
          </div>
        </div>
      } @else {
        @if (tema(); as t) {
          <h2 class="mb-1"><i class="bi bi-journal-richtext me-2"></i>{{ t.nombre_canonical }}</h2>
          <p class="text-muted mb-4">Leccion del tema</p>

          @if (t.leccion_html) {
            <div class="lesson-content" [innerHTML]="t.leccion_html"></div>

            <div class="d-flex gap-2 mt-4 mb-3">
              <a [routerLink]="['/practice/tema', temaId()]" [queryParams]="{examenId: examenId()}" class="btn btn-success">
                <i class="bi bi-play-fill me-1"></i> Practicar este tema
              </a>
            </div>

            <!-- Upsell after reading a free lesson -->
            @if (access() === 'free' && quota.isFree()) {
              <div class="card border-primary mt-3">
                <div class="card-body text-center py-3">
                  <p class="text-primary mb-2"><i class="bi bi-star-fill me-1"></i> Desbloquea todos los temas y practica sin limites</p>
                  <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-primary btn-sm">
                    Suscribirme - $99 MXN/mes
                  </a>
                </div>
              </div>
            }
          } @else {
            <div class="text-center text-muted py-5">
              <i class="bi bi-journal-x fs-1 d-block mb-2"></i>
              <p class="fs-5">Esta leccion aun no ha sido generada.</p>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    :host ::ng-deep .lesson-content {
      h2 { font-size: 1.6rem; font-weight: 700; color: var(--bs-primary); margin-top: 1.5rem; margin-bottom: 0.75rem; }
      h3 { font-size: 1.3rem; font-weight: 600; color: #333; margin-top: 1.25rem; margin-bottom: 0.5rem; }
      h4 { font-size: 1.1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
      p { line-height: 1.7; margin-bottom: 0.75rem; }
      ul, ol { margin-bottom: 0.75rem; padding-left: 1.5rem; }
      li { margin-bottom: 0.35rem; line-height: 1.6; }
      strong { color: #1a5632; }
      blockquote {
        border-left: 4px solid var(--bs-warning);
        background: #fff8e1;
        padding: 0.75rem 1rem;
        margin: 1rem 0;
        border-radius: 0 8px 8px 0;
        font-style: italic;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      th, td {
        border: 1px solid #dee2e6;
        padding: 0.5rem 0.75rem;
        text-align: left;
      }
      th { background: #f8f9fa; font-weight: 600; }
    }
  `],
})
export class TopicLessonComponent {
  private route = inject(ActivatedRoute);
  private fs = inject(Firestore);
  private examenSvc = inject(ExamenService);
  auth = inject(AuthService);
  quota = inject(QuotaService);

  temaId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('temaId')!)),
    { initialValue: '' },
  );

  examenId = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('examenId') ?? '')),
    { initialValue: '' },
  );

  tema = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('temaId')!),
      switchMap((id) => docData(doc(this.fs, 'temas', id), { idField: 'id' }) as import('rxjs').Observable<Tema>),
    ),
  );

  private temasConfig = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => p.get('examenId') ?? ''),
      switchMap((eid) => eid ? this.examenSvc.listTemasConfig(eid) : of([])),
    ),
    { initialValue: [] },
  );

  /** Determine access: 'free', 'paid', or 'locked' */
  access = computed(() => {
    const eid = this.examenId();
    const tid = this.temaId();
    const configs = this.temasConfig();

    // No exam context → allow (backwards compat for direct links)
    if (!eid) return 'free' as const;

    return this.quota.getTemaAccess(tid, eid, configs);
  });
}
