import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExamenService } from '../../core/services/examen.service';

@Component({
  selector: 'app-explore-schools',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <h2 class="mb-2"><i class="bi bi-building me-2"></i>Elige tu escuela</h2>
      <p class="text-muted mb-4">Selecciona la institucion para la que te estas preparando.</p>

      @if (escuelas() === undefined) {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else {
        <div class="row g-3">
          @for (esc of escuelas(); track esc.nombre) {
            <div class="col-sm-6 col-md-4 col-lg-3">
              <a [routerLink]="['/explore', esc.nombre]" class="card explore-card h-100 text-decoration-none">
                <div class="card-body d-flex flex-column align-items-center justify-content-center text-center">
                  <i class="bi bi-bank2 fs-1 mb-2 text-primary"></i>
                  <h5 class="card-title mb-0">{{ esc.nombre }}</h5>
                </div>
              </a>
            </div>
          } @empty {
            <div class="col-12 text-center text-muted py-5">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <p class="fs-5">No hay escuelas registradas aun.</p>
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
export class ExploreSchoolsComponent {
  private examenSvc = inject(ExamenService);
  escuelas = toSignal(this.examenSvc.getEscuelas());
}
