import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';

@Component({
  selector: 'app-explore-exam-types',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a routerLink="/explore" class="btn btn-warning btn-sm mb-3">
        <i class="bi bi-arrow-left me-1"></i> Escuelas
      </a>

      <h2 class="mb-2"><i class="bi bi-clipboard-check me-2"></i>{{ escuela() }}</h2>
      <p class="text-muted mb-4">Elige el tipo de examen que vas a presentar.</p>

      <div class="row g-3">
        @for (ex of examenes(); track ex.id) {
          <div class="col-sm-6 col-md-4">
            <a [routerLink]="['/explore', escuela(), ex.id]" class="card explore-card h-100 text-decoration-none">
              <div class="card-body text-center">
                <i class="bi bi-file-earmark-text fs-1 mb-2 text-success"></i>
                <h5 class="card-title">{{ ex.nombre }}</h5>
                <p class="text-muted small mb-0">{{ ex.area }} · {{ ex.total_reactivos }} reactivos</p>
              </div>
            </a>
          </div>
        } @empty {
          <div class="col-12 text-center text-muted py-5">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            <p class="fs-5">No hay examenes para esta escuela.</p>
          </div>
        }
      </div>
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
export class ExploreExamTypesComponent {
  private route = inject(ActivatedRoute);
  private examenSvc = inject(ExamenService);

  escuela = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('escuela')!)),
    { initialValue: '' },
  );

  examenes = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('escuela')!),
      switchMap((esc) => this.examenSvc.listByEscuela(esc)),
      map((exams) => {
        const seen = new Map<string, true>();
        return exams.filter((ex) => {
          const key = `${ex.nombre}|${ex.area}`;
          if (seen.has(key)) return false;
          seen.set(key, true);
          return true;
        });
      }),
    ),
    { initialValue: [] },
  );
}
