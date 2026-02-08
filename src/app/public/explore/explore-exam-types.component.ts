import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SchoolService } from '../../core/services/school.service';
import { ExamTypeService } from '../../core/services/exam-type.service';

@Component({
  selector: 'app-explore-exam-types',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a routerLink="/explore" class="btn btn-outline-secondary btn-sm mb-3">&larr; Escuelas</a>

      @if (school(); as s) {
        <h2 class="mb-2">{{ s.name }}</h2>
        <p class="text-muted mb-4">Elige el tipo de examen que vas a presentar.</p>
      }

      <div class="row g-3">
        @for (et of filteredExamTypes(); track et.id) {
          <div class="col-sm-6 col-md-4 col-lg-3">
            <a [routerLink]="['/explore', schoolId(), et.id]" class="card explore-card h-100 text-decoration-none">
              <div class="card-body d-flex align-items-center justify-content-center text-center">
                <h5 class="card-title mb-0">{{ et.name }}</h5>
              </div>
            </a>
          </div>
        } @empty {
          <div class="col-12 text-center text-muted py-5">
            <p class="fs-5">No hay tipos de examen para esta escuela.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .explore-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
      cursor: pointer;
      min-height: 120px;
      color: #1a1a2e;
    }
    .explore-card:hover {
      border-color: #0f3460;
      box-shadow: 0 4px 12px rgba(15, 52, 96, 0.15);
    }
  `],
})
export class ExploreExamTypesComponent {
  private route = inject(ActivatedRoute);
  private schoolSvc = inject(SchoolService);
  private examTypeSvc = inject(ExamTypeService);

  schoolId = toSignal(this.route.paramMap.pipe(map((p) => p.get('schoolId')!)), { initialValue: '' });
  private schools = toSignal(this.schoolSvc.list(), { initialValue: [] });
  private examTypes = toSignal(this.examTypeSvc.list(), { initialValue: [] });

  school = computed(() => this.schools().find((s) => s.id === this.schoolId()));
  filteredExamTypes = computed(() =>
    this.examTypes().filter((et) => et.schoolId === this.schoolId() && et.active),
  );
}
