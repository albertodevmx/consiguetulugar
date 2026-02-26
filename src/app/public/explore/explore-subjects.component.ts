import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { TemaConfig } from '../../core/models';

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
        @for (group of groupedBySections(); track group.seccion) {
          <h5 class="mt-4 mb-3"><i class="bi bi-folder2-open me-2"></i>{{ group.seccion || 'General' }}</h5>
          <div class="row g-3 mb-3">
            @for (tc of group.temas; track tc.id) {
              <div class="col-sm-6 col-md-4 col-lg-3">
                <div class="card explore-card h-100">
                  <div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
                    <i class="bi bi-book fs-1 mb-2 text-info"></i>
                    <h6 class="card-title mb-1">{{ tc.nombre_mostrar }}</h6>
                    <small class="text-muted mb-2">{{ tc.num_reactivos }} reactivos</small>
                    <div class="mb-1">
                      @for (d of tc.dificultades; track d) {
                        @switch (d) {
                          @case (1) { <span class="badge bg-success me-1">F</span> }
                          @case (2) { <span class="badge bg-warning text-dark me-1">M</span> }
                          @case (3) { <span class="badge bg-danger me-1">D</span> }
                        }
                      }
                    </div>
                    <a [routerLink]="['/practice/tema', tc.tema_id]" class="btn btn-success btn-sm mt-2">
                      <i class="bi bi-play-fill me-1"></i>Practicar
                    </a>
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
}
