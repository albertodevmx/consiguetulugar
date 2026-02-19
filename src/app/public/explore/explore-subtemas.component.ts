import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, combineLatest } from 'rxjs';
import { MateriaService } from '../../core/services/materia.service';
import { SubtemaService } from '../../core/services/subtema.service';
import { PreguntaService } from '../../core/services/pregunta.service';
import { Subtema } from '../../core/models';

@Component({
  selector: 'app-explore-subtemas',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a [routerLink]="['/explore', escuela(), examenId(), materiaId()]" class="btn btn-warning btn-sm mb-3">
        <i class="bi bi-arrow-left me-1"></i> Temas
      </a>

      @if (materia(); as m) {
        <h2 class="mb-2"><i class="bi bi-journal-bookmark me-2"></i>Subtemas</h2>
        <p class="text-muted mb-4">Elige un subtema para practicar.</p>
      }

      @if (subtemasWithCount() === undefined) {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else {
        <div class="list-group">
          @for (item of subtemasWithCount(); track item.subtema.id) {
            <a
              [routerLink]="['/practice/subtema', materiaId(), temaId(), item.subtema.id]"
              class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <span><i class="bi bi-journal-bookmark me-2"></i>{{ item.subtema.orden }}. {{ item.subtema.nombre_canonical }}</span>
              <span class="badge bg-success rounded-pill">
                <i class="bi bi-play-fill me-1"></i>{{ item.count }} preguntas
              </span>
            </a>
          } @empty {
            <div class="text-center text-muted py-5">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <p class="fs-5">No hay subtemas disponibles.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ExploreSubtemasComponent {
  private route = inject(ActivatedRoute);
  private materiaSvc = inject(MateriaService);
  private subtemaSvc = inject(SubtemaService);
  private preguntaSvc = inject(PreguntaService);

  escuela = toSignal(this.route.paramMap.pipe(map((p) => p.get('escuela')!)), { initialValue: '' });
  examenId = toSignal(this.route.paramMap.pipe(map((p) => p.get('examenId')!)), { initialValue: '' });
  materiaId = toSignal(this.route.paramMap.pipe(map((p) => p.get('materiaId')!)), { initialValue: '' });
  temaId = toSignal(this.route.paramMap.pipe(map((p) => p.get('temaId')!)), { initialValue: '' });

  materia = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('materiaId')!),
      switchMap((id) => this.materiaSvc.get(id)),
    ),
    { initialValue: undefined },
  );

  subtemasWithCount = toSignal(
    this.route.paramMap.pipe(
      switchMap((p) => {
        const materiaId = p.get('materiaId')!;
        const temaId = p.get('temaId')!;
        return combineLatest([
          this.subtemaSvc.listByTema(materiaId, temaId),
          this.preguntaSvc.listByTema(temaId),
        ]);
      }),
      map(([subtemas, preguntas]) => {
        const counts = new Map<string, number>();
        for (const q of preguntas) {
          counts.set(q.subtema_id, (counts.get(q.subtema_id) ?? 0) + 1);
        }
        return subtemas.map((subtema) => ({
          subtema,
          count: counts.get(subtema.id!) ?? 0,
        }));
      }),
    ),
  );
}
