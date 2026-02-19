import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';

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
        <p class="text-muted mb-4">Elige la materia que quieres estudiar.</p>
      }

      @if (materiasMapping() === undefined) {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else {
        <div class="row g-3">
          @for (mat of materiasMapping(); track mat.id) {
            <div class="col-sm-6 col-md-4 col-lg-3">
              <a [routerLink]="['/explore', escuela(), examenId(), mat.materia_id]" class="card explore-card h-100 text-decoration-none">
                <div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
                  <i class="bi bi-book fs-1 mb-2 text-info"></i>
                  <h5 class="card-title mb-1">{{ mat.nombre_en_guia }}</h5>
                  <small class="text-muted">{{ mat.num_reactivos }} reactivos</small>
                </div>
              </a>
            </div>
          } @empty {
            <div class="col-12 text-center text-muted py-5">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <p class="fs-5">No hay materias asignadas a este examen.</p>
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
      cursor: pointer;
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

  materiasMapping = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('examenId')!),
      switchMap((id) => this.examenSvc.listMateriasMapping(id)),
    ),
  );
}
