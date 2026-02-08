import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ExamTypeService } from '../../core/services/exam-type.service';
import { ExamTypeSubjectService } from '../../core/services/exam-type-subject.service';
import { SubjectService } from '../../core/services/subject.service';

@Component({
  selector: 'app-explore-subjects',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a [routerLink]="['/explore', schoolId()]" class="btn btn-outline-secondary btn-sm mb-3">&larr; Tipos de examen</a>

      @if (examType(); as et) {
        <h2 class="mb-2">{{ et.name }}</h2>
        <p class="text-muted mb-4">Elige la materia que quieres estudiar.</p>
      }

      <div class="row g-3">
        @for (subj of filteredSubjects(); track subj.id) {
          <div class="col-sm-6 col-md-4 col-lg-3">
            <a [routerLink]="['/explore', schoolId(), examTypeId(), subj.id]" class="card explore-card h-100 text-decoration-none">
              <div class="card-body d-flex align-items-center justify-content-center text-center">
                <h5 class="card-title mb-0">{{ subj.name }}</h5>
              </div>
            </a>
          </div>
        } @empty {
          <div class="col-12 text-center text-muted py-5">
            <p class="fs-5">No hay materias asignadas a este tipo de examen.</p>
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
export class ExploreSubjectsComponent {
  private route = inject(ActivatedRoute);
  private examTypeSvc = inject(ExamTypeService);
  private etsSvc = inject(ExamTypeSubjectService);
  private subjectSvc = inject(SubjectService);

  schoolId = toSignal(this.route.paramMap.pipe(map((p) => p.get('schoolId')!)), { initialValue: '' });
  examTypeId = toSignal(this.route.paramMap.pipe(map((p) => p.get('examTypeId')!)), { initialValue: '' });

  private examTypes = toSignal(this.examTypeSvc.list(), { initialValue: [] });
  private ets = toSignal(this.etsSvc.list(), { initialValue: [] });
  private subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });

  examType = computed(() => this.examTypes().find((et) => et.id === this.examTypeId()));

  filteredSubjects = computed(() => {
    const subjectIds = new Set(
      this.ets()
        .filter((e) => e.examTypeId === this.examTypeId())
        .map((e) => e.subjectId),
    );
    return this.subjects().filter((s) => subjectIds.has(s.id!) && s.active);
  });
}
