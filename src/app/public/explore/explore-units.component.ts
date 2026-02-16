import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, combineLatest, of } from 'rxjs';
import { MateriaService } from '../../core/services/materia.service';
import { TemaService } from '../../core/services/tema.service';
import { SubtemaService } from '../../core/services/subtema.service';
import { PreguntaService } from '../../core/services/pregunta.service';
import { Tema, Subtema } from '../../core/models';

@Component({
  selector: 'app-explore-units',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a [routerLink]="['/explore', escuela(), examenId()]" class="btn btn-warning btn-sm mb-3">
        <i class="bi bi-arrow-left me-1"></i> Materias
      </a>

      @if (materia(); as m) {
        <h2 class="mb-2"><i class="bi bi-list-columns-reverse me-2"></i>{{ m.nombre_canonical }}</h2>
        <p class="text-muted mb-4">Abre una unidad para ver sus subtemas o practica directamente.</p>
      }

      <div class="accordion" id="temasAccordion">
        @for (item of temasData(); track item.tema.id; let i = $index) {
          <div class="accordion-item">
            <h2 class="accordion-header d-flex align-items-center" [id]="'heading-' + i">
              <button
                class="accordion-button collapsed flex-grow-1"
                type="button"
                data-bs-toggle="collapse"
                [attr.data-bs-target]="'#collapse-' + i"
                [attr.aria-expanded]="false"
                [attr.aria-controls]="'collapse-' + i"
              >
                <i class="bi bi-folder2-open me-2"></i>{{ item.tema.orden }}. {{ item.tema.nombre_canonical }}
                <span class="badge bg-secondary ms-2">{{ item.count }} preguntas</span>
              </button>
              <a
                [routerLink]="['/practice/tema', materiaId(), item.tema.id]"
                class="btn btn-success btn-sm me-3 text-nowrap"
                (click)="$event.stopPropagation()"
              >
                <i class="bi bi-play-fill me-1"></i>Practicar unidad
              </a>
            </h2>
            <div
              [id]="'collapse-' + i"
              class="accordion-collapse collapse"
              [attr.aria-labelledby]="'heading-' + i"
              data-bs-parent="#temasAccordion"
            >
              <div class="accordion-body">
                <ul class="list-unstyled mb-0">
                  @for (sub of item.subtemas; track sub.id) {
                    <li class="py-1">
                      <i class="bi bi-bookmark me-2 text-muted"></i>{{ sub.nombre_canonical }}
                    </li>
                  } @empty {
                    <li class="text-muted">No hay subtemas registrados.</li>
                  }
                </ul>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center text-muted py-5">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            <p class="fs-5">No hay temas para esta materia.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ExploreUnitsComponent {
  private route = inject(ActivatedRoute);
  private materiaSvc = inject(MateriaService);
  private temaSvc = inject(TemaService);
  private subtemaSvc = inject(SubtemaService);
  private preguntaSvc = inject(PreguntaService);

  escuela = toSignal(this.route.paramMap.pipe(map((p) => p.get('escuela')!)), { initialValue: '' });
  examenId = toSignal(this.route.paramMap.pipe(map((p) => p.get('examenId')!)), { initialValue: '' });
  materiaId = toSignal(this.route.paramMap.pipe(map((p) => p.get('materiaId')!)), { initialValue: '' });

  materia = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('materiaId')!),
      switchMap((id) => this.materiaSvc.get(id)),
    ),
    { initialValue: undefined },
  );

  temasData = toSignal(
    this.route.paramMap.pipe(
      switchMap((p) => {
        const materiaId = p.get('materiaId')!;
        return combineLatest([
          this.temaSvc.listByMateria(materiaId),
          this.preguntaSvc.listByMateria(materiaId),
        ]).pipe(
          switchMap(([temas, preguntas]) => {
            if (temas.length === 0) return of([] as { tema: Tema; subtemas: Subtema[]; count: number }[]);

            // Count preguntas per tema using tema_id directly
            const countByTema = new Map<string, number>();
            for (const q of preguntas) {
              if (q.tema_id) {
                countByTema.set(q.tema_id, (countByTema.get(q.tema_id) ?? 0) + 1);
              }
            }

            // Fetch subtemas for each tema (for accordion display)
            const subtema$ = temas.map((t) =>
              this.subtemaSvc.listByTema(materiaId, t.id!),
            );
            return combineLatest(subtema$).pipe(
              map((subtemasArrays) =>
                temas.map((tema, i) => ({
                  tema,
                  subtemas: subtemasArrays[i],
                  count: countByTema.get(tema.id!) ?? 0,
                })),
              ),
            );
          }),
        );
      }),
    ),
    { initialValue: [] as { tema: Tema; subtemas: Subtema[]; count: number }[] },
  );
}
