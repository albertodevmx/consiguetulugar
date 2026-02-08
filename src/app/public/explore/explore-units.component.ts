import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SubjectService } from '../../core/services/subject.service';
import { UnitService } from '../../core/services/unit.service';
import { UnitTopicService } from '../../core/services/unit-topic.service';
import { TopicService } from '../../core/services/topic.service';

interface UnitWithTopics {
  id: string;
  name: string;
  topics: { id: string; name: string }[];
}

@Component({
  selector: 'app-explore-units',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <a [routerLink]="['/explore', schoolId(), examTypeId()]" class="btn btn-outline-secondary btn-sm mb-3">&larr; Materias</a>

      @if (subject(); as s) {
        <h2 class="mb-2">{{ s.name }}</h2>
        <p class="text-muted mb-4">Elige un tema para comenzar a practicar.</p>
      }

      @for (unit of unitsWithTopics(); track unit.id) {
        <div class="card mb-3">
          <div class="card-header fw-bold">{{ unit.name }}</div>
          <div class="list-group list-group-flush">
            @for (topic of unit.topics; track topic.id) {
              <a
                [routerLink]="['/practice', 'topic', topic.id]"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                {{ topic.name }}
                <span class="badge bg-primary rounded-pill">Practicar</span>
              </a>
            } @empty {
              <div class="list-group-item text-muted">Sin temas asignados a esta unidad.</div>
            }
          </div>
        </div>
      } @empty {
        <div class="text-center text-muted py-5">
          <p class="fs-5">No hay unidades para esta materia.</p>
        </div>
      }
    </div>
  `,
})
export class ExploreUnitsComponent {
  private route = inject(ActivatedRoute);
  private subjectSvc = inject(SubjectService);
  private unitSvc = inject(UnitService);
  private utSvc = inject(UnitTopicService);
  private topicSvc = inject(TopicService);

  schoolId = toSignal(this.route.paramMap.pipe(map((p) => p.get('schoolId')!)), { initialValue: '' });
  examTypeId = toSignal(this.route.paramMap.pipe(map((p) => p.get('examTypeId')!)), { initialValue: '' });
  subjectId = toSignal(this.route.paramMap.pipe(map((p) => p.get('subjectId')!)), { initialValue: '' });

  private subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  private units = toSignal(this.unitSvc.list(), { initialValue: [] });
  private unitTopics = toSignal(this.utSvc.list(), { initialValue: [] });
  private topics = toSignal(this.topicSvc.list(), { initialValue: [] });

  subject = computed(() => this.subjects().find((s) => s.id === this.subjectId()));

  unitsWithTopics = computed((): UnitWithTopics[] => {
    const subjectUnits = this.units().filter(
      (u) => u.subjectId === this.subjectId() && u.active,
    );
    return subjectUnits.map((unit) => {
      const topicIds = this.unitTopics()
        .filter((ut) => ut.unitId === unit.id)
        .map((ut) => ut.topicId);
      const topics = this.topics()
        .filter((t) => topicIds.includes(t.id!) && t.active)
        .map((t) => ({ id: t.id!, name: t.name }));
      return { id: unit.id!, name: unit.name, topics };
    });
  });
}
