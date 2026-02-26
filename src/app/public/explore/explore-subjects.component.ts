import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { TemaConfig } from '../../core/models';

const SECCION_ICONS: Record<string, string> = {
  matematicas: 'bi-calculator',
  matemáticas: 'bi-calculator',
  español: 'bi-chat-text',
  espanol: 'bi-chat-text',
  biologia: 'bi-tree',
  biología: 'bi-tree',
  quimica: 'bi-droplet-half',
  química: 'bi-droplet-half',
  fisica: 'bi-lightning-charge',
  física: 'bi-lightning-charge',
  historia: 'bi-hourglass-split',
  geografia: 'bi-globe-americas',
  geografía: 'bi-globe-americas',
  ingles: 'bi-translate',
  inglés: 'bi-translate',
  filosofia: 'bi-lightbulb',
  filosofía: 'bi-lightbulb',
  literatura: 'bi-journal-text',
  economia: 'bi-graph-up-arrow',
  economía: 'bi-graph-up-arrow',
  derecho: 'bi-bank',
  civica: 'bi-people',
  cívica: 'bi-people',
  etica: 'bi-shield-check',
  ética: 'bi-shield-check',
  arte: 'bi-palette',
  artes: 'bi-palette',
  computacion: 'bi-cpu',
  computación: 'bi-cpu',
  informatica: 'bi-cpu',
  informática: 'bi-cpu',
  psicologia: 'bi-brain',
  psicología: 'bi-brain',
  sociologia: 'bi-diagram-3',
  sociología: 'bi-diagram-3',
  estadistica: 'bi-bar-chart-line',
  estadística: 'bi-bar-chart-line',
  contabilidad: 'bi-cash-stack',
  administracion: 'bi-briefcase',
  administración: 'bi-briefcase',
};

@Component({
  selector: 'app-explore-subjects',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a [routerLink]="['/explore', escuela()]" class="btn btn-warning btn-sm mb-3">
        <i class="bi bi-arrow-left me-1"></i> Tipos de examen
      </a>

      @if (examen(); as ex) {
        <h2 class="mb-2"><i class="bi bi-journal-text me-2"></i>{{ ex.nombre }}</h2>
        <p class="text-muted mb-1">{{ ex.total_reactivos }} reactivos | {{ ex.tiempo_limite_minutos }} minutos</p>
        <div class="d-flex gap-2 mb-4">
          <p class="text-muted mb-0">Elige un tema para practicar o inicia un examen simulacion.</p>
          <a [routerLink]="['/exam-simulation', examenId()]" class="btn btn-primary btn-sm text-nowrap">
            <i class="bi bi-clock me-1"></i> Examen Simulacion
          </a>
        </div>
      }

      <!-- Upsell for non-logged-in users -->
      @if (!auth.isLoggedIn()) {
        <div class="alert alert-warning d-flex flex-column flex-sm-row align-items-sm-center gap-2 mb-3">
          <span><i class="bi bi-lock me-1"></i>Registrate gratis para practicar. Obtendras 30 preguntas de prueba.</span>
          <a routerLink="/registro" class="btn btn-sm btn-warning text-nowrap">
            <i class="bi bi-person-plus me-1"></i> Crear cuenta
          </a>
        </div>
      }

      <!-- Upsell for free users -->
      @if (auth.isLoggedIn() && quota.isFree()) {
        <div class="alert alert-info d-flex flex-column flex-sm-row align-items-sm-center gap-2 mb-3">
          <span><i class="bi bi-star me-1"></i>Suscribete para practicar sin limites.</span>
          <a [routerLink]="['/suscripcion']" [queryParams]="{examenId: examenId()}" class="btn btn-sm btn-primary text-nowrap">
            <i class="bi bi-star-fill me-1"></i> Suscribirme
          </a>
        </div>
      }

      @if (temasConfig() === undefined) {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else {
        <div class="accordion" id="subjectsAccordion">
          @for (group of groupedBySections(); track group.seccion; let i = $index) {
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button" type="button"
                  [class.collapsed]="!expandedSections().has(group.seccion)"
                  (click)="toggleSection(group.seccion)">
                  <i class="bi me-2" [class]="sectionIcon(group.seccion)"></i>
                  {{ group.seccion || 'General' }}
                  <span class="badge bg-secondary ms-2">{{ group.temas.length }}</span>
                </button>
              </h2>
              @if (expandedSections().has(group.seccion)) {
                <div class="accordion-body p-3">
                  <!-- Desktop: cards -->
                  <div class="d-none d-md-block">
                    <div class="row g-3">
                      @for (tc of group.temas; track tc.id) {
                        <div class="col-md-4 col-lg-3">
                          <div class="card explore-card h-100">
                            <div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
                              <i class="bi fs-1 mb-2 text-info" [class]="sectionIcon(group.seccion)"></i>
                              <h6 class="card-title mb-3">{{ tc.nombre_mostrar }}</h6>
                              <div class="d-flex gap-2 mt-auto">
                                <a [routerLink]="['/lesson', tc.tema_id]" class="btn btn-outline-info">
                                  <i class="bi bi-journal-richtext me-1"></i>Leccion
                                </a>
                                <a [routerLink]="['/practice/tema', tc.tema_id]" class="btn btn-success">
                                  <i class="bi bi-play-fill me-1"></i>Practicar
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                  <!-- Mobile: compact list -->
                  <div class="d-md-none">
                    <div class="list-group list-group-flush">
                      @for (tc of group.temas; track tc.id) {
                        <div class="list-group-item d-flex align-items-center gap-2 px-0">
                          <i class="bi text-info" [class]="sectionIcon(group.seccion)"></i>
                          <span class="flex-grow-1 small">{{ tc.nombre_mostrar }}</span>
                          <a [routerLink]="['/lesson', tc.tema_id]" class="btn btn-outline-info btn-sm py-0 px-2">
                            <i class="bi bi-journal-richtext"></i>
                          </a>
                          <a [routerLink]="['/practice/tema', tc.tema_id]" class="btn btn-success btn-sm py-0 px-2">
                            <i class="bi bi-play-fill"></i>
                          </a>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          } @empty {
            <div class="text-center text-muted py-5">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <p class="fs-5">No hay temas asignados a este examen.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .explore-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
      min-height: 140px;
    }
    .explore-card:hover {
      border-color: var(--bs-success);
      box-shadow: 0 4px 12px rgba(25, 135, 84, 0.15);
      transform: translateY(-2px);
    }
    .accordion-button:not(.collapsed) {
      background-color: rgba(13, 202, 240, 0.08);
      color: inherit;
      box-shadow: none;
    }
    .list-group-item {
      border-left: 0;
      border-right: 0;
    }
  `],
})
export class ExploreSubjectsComponent {
  private route = inject(ActivatedRoute);
  private examenSvc = inject(ExamenService);
  auth = inject(AuthService);
  quota = inject(QuotaService);

  escuela = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('escuela')!)),
    { initialValue: '' },
  );
  examenId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('examenId')!)),
    { initialValue: '' },
  );

  private examenes = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('escuela')!),
      switchMap((esc) => this.examenSvc.listByEscuela(esc)),
    ),
    { initialValue: [] },
  );

  examen = computed(() => this.examenes().find((e) => e.id === this.examenId()));

  temasConfig = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('examenId')!),
      switchMap((id) => this.examenSvc.listTemasConfig(id)),
    ),
  );

  groupedBySections = computed(() => {
    const configs = this.temasConfig() ?? [];
    const groups = new Map<string, TemaConfig[]>();
    for (const tc of configs) {
      const key = tc.seccion || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tc);
    }
    return [...groups.entries()].map(([seccion, temas]) => ({ seccion, temas }));
  });

  // All sections expanded by default
  expandedSections = computed(() => {
    const groups = this.groupedBySections();
    const set = this._expandedOverrides();
    if (set !== null) return set;
    return new Set(groups.map((g) => g.seccion));
  });

  private _expandedOverrides = signal<Set<string> | null>(null);

  toggleSection(seccion: string) {
    const current = new Set(this.expandedSections());
    if (current.has(seccion)) {
      current.delete(seccion);
    } else {
      current.add(seccion);
    }
    this._expandedOverrides.set(current);
  }

  sectionIcon(seccion: string): string {
    const key = (seccion || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return SECCION_ICONS[key] ?? 'bi-book';
  }
}
