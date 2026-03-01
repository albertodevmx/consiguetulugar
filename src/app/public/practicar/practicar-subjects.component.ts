import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProgresoService } from '../../core/services/progreso.service';
import { TemaConfig, ProgresoTema, calcularDominio } from '../../core/models';

const SECCION_ICONS: Record<string, string> = {
  matematicas: 'bi-calculator',
  'matemáticas': 'bi-calculator',
  'español': 'bi-chat-text',
  espanol: 'bi-chat-text',
  biologia: 'bi-tree',
  'biología': 'bi-tree',
  quimica: 'bi-droplet-half',
  'química': 'bi-droplet-half',
  fisica: 'bi-lightning-charge',
  'física': 'bi-lightning-charge',
  historia: 'bi-hourglass-split',
  'historia universal': 'bi-hourglass-split',
  'historia de mexico': 'bi-hourglass-split',
  'historia de méxico': 'bi-hourglass-split',
  geografia: 'bi-globe-americas',
  'geografía': 'bi-globe-americas',
  ingles: 'bi-translate',
  'inglés': 'bi-translate',
  filosofia: 'bi-lightbulb',
  'filosofía': 'bi-lightbulb',
  literatura: 'bi-journal-text',
  economia: 'bi-graph-up-arrow',
  'economía': 'bi-graph-up-arrow',
  derecho: 'bi-bank',
  civica: 'bi-people',
  'cívica': 'bi-people',
  etica: 'bi-shield-check',
  'ética': 'bi-shield-check',
  arte: 'bi-palette',
  artes: 'bi-palette',
  computacion: 'bi-cpu',
  'computación': 'bi-cpu',
  informatica: 'bi-cpu',
  'informática': 'bi-cpu',
  psicologia: 'bi-brain',
  'psicología': 'bi-brain',
  sociologia: 'bi-diagram-3',
  'sociología': 'bi-diagram-3',
  estadistica: 'bi-bar-chart-line',
  'estadística': 'bi-bar-chart-line',
  contabilidad: 'bi-cash-stack',
  administracion: 'bi-briefcase',
  'administración': 'bi-briefcase',
};

@Component({
  selector: 'app-practicar-subjects',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a routerLink="/practicar" class="btn btn-outline-primary btn-sm mb-3">
        <i class="bi bi-arrow-left me-1"></i> Mis exámenes
      </a>

      @if (examen(); as ex) {
        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
          <h2 class="mb-0"><i class="bi bi-journal-text me-2"></i>{{ ex.nombre }}</h2>
        </div>
        <p class="text-muted mb-1">{{ ex.escuela }} · {{ ex.area }}</p>

        <div class="d-flex flex-wrap gap-2 mb-4">
          <a [routerLink]="['/exam-simulation', examenId()]" class="btn btn-primary">
            <i class="bi bi-clock me-1"></i> Examen Simulacro
          </a>
        </div>
      }

      <!-- Progress summary for this exam -->
      @if (progresoLoaded()) {
        <div class="row g-3 mb-4">
          <div class="col-6">
            <div class="progress-summary-card">
              <div class="ps-value">{{ examDominio() }}%</div>
              <div class="ps-label">Dominio</div>
            </div>
          </div>
          <div class="col-6">
            <div class="progress-summary-card">
              <div class="ps-value">{{ examPorcentaje() }}%</div>
              <div class="ps-label">Acierto</div>
            </div>
          </div>
        </div>
      }

      @if (temasConfig() === undefined) {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else {
        <div class="accordion" id="practiceAccordion">
          @for (group of groupedBySections(); track group.seccion; let i = $index) {
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button" type="button"
                  [class.collapsed]="!expandedSections().has(group.seccion)"
                  (click)="toggleSection(group.seccion)">
                  <i class="bi me-2" [class]="sectionIcon(group.seccion)"></i>
                  {{ group.seccion || 'General' }}
                </button>
              </h2>
              @if (expandedSections().has(group.seccion)) {
                <div class="accordion-body p-3">
                  <!-- Desktop: cards -->
                  <div class="d-none d-md-block">
                    <div class="row g-3">
                      @for (tc of group.temas; track tc.id) {
                        <div class="col-md-4 col-lg-3">
                          <div class="card practice-card h-100">
                            <div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
                              @if (getTemaDominio(tc.tema_id); as dom) {
                                <div class="progress-mini mb-2">
                                  <div class="progress" style="height: 4px; width: 60px;">
                                    <div class="progress-bar bg-success" [style.width.%]="dom"></div>
                                  </div>
                                  <small class="text-muted" style="font-size: 0.65rem">{{ dom }}%</small>
                                </div>
                              }
                              <h6 class="card-title mb-3">{{ tc.nombre_mostrar }}</h6>
                              <div class="d-flex gap-2 mt-auto">
                                <a [routerLink]="['/lesson', tc.tema_id]" [queryParams]="{examenId: examenId()}" class="btn btn-outline-info btn-sm">
                                  <i class="bi bi-journal-richtext me-1"></i>Lección
                                </a>
                                <a [routerLink]="['/practice/tema', tc.tema_id]" [queryParams]="{examenId: examenId()}" class="btn btn-success btn-sm">
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
                          @if (getTemaDominio(tc.tema_id); as dom) {
                            <span class="badge bg-success" style="font-size:0.6rem">{{ dom }}%</span>
                          }
                          <span class="flex-grow-1 small">{{ tc.nombre_mostrar }}</span>
                          <a [routerLink]="['/lesson', tc.tema_id]" [queryParams]="{examenId: examenId()}" class="btn btn-outline-info btn-sm py-0 px-2">
                            <i class="bi bi-journal-richtext"></i>
                          </a>
                          <a [routerLink]="['/practice/tema', tc.tema_id]" [queryParams]="{examenId: examenId()}" class="btn btn-success btn-sm py-0 px-2">
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
    .practice-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
      min-height: 140px;
    }
    .practice-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
    .accordion-button:not(.collapsed) {
      background-color: rgba(26, 115, 232, 0.08);
      color: inherit;
      box-shadow: none;
    }
    .list-group-item {
      border-left: 0;
      border-right: 0;
    }
    .progress-summary-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 0.75rem;
      text-align: center;
    }
    .ps-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: #1a73e8;
    }
    .ps-label {
      font-size: 0.7rem;
      color: #666;
    }
    .progress-mini {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
  `],
})
export class PracticarSubjectsComponent {
  private route = inject(ActivatedRoute);
  private examenSvc = inject(ExamenService);
  private progresoSvc = inject(ProgresoService);
  auth = inject(AuthService);

  private allProgreso = toSignal(this.progresoSvc.getAllProgreso$(), { initialValue: [] });

  private progresoMap = computed(() => {
    const m = new Map<string, ProgresoTema>();
    for (const p of this.allProgreso()) {
      m.set(p.tema_id, p);
    }
    return m;
  });

  progresoLoaded = computed(() => this.allProgreso().length >= 0);

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

  // Progress metrics for this exam
  private examTotalPreguntas = computed(() => {
    const temaIds = new Set((this.temasConfig() ?? []).map((t) => t.tema_id));
    let total = 0;
    for (const [id, p] of this.progresoMap()) {
      if (temaIds.has(id)) total += p.total;
    }
    return total;
  });

  private examCorrectas = computed(() => {
    const temaIds = new Set((this.temasConfig() ?? []).map((t) => t.tema_id));
    let correctas = 0;
    for (const [id, p] of this.progresoMap()) {
      if (temaIds.has(id)) correctas += (p.correctas ?? 0);
    }
    return correctas;
  });

  examPorcentaje = computed(() => {
    const total = this.examTotalPreguntas();
    if (total === 0) return 0;
    return Math.round((this.examCorrectas() / total) * 100);
  });

  examDominio = computed(() => {
    return calcularDominio(this.examCorrectas(), this.examTotalPreguntas());
  });

  // All sections expanded by default in practice view
  expandedSections = computed(() => {
    const set = this._expandedOverrides();
    if (set !== null) return set;
    const all = new Set(this.groupedBySections().map((g) => g.seccion));
    return all;
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

  /** Returns mastery percentage for a topic, or null if no progress */
  getTemaDominio(temaId: string): number | null {
    const prog = this.progresoMap().get(temaId);
    if (!prog || prog.total === 0) return null;
    return calcularDominio(prog.correctas ?? 0, prog.total);
  }
}
