import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { toSignal } from '@angular/core/rxjs-interop';
import { SchoolService } from '../../core/services/school.service';
import { SubjectService } from '../../core/services/subject.service';
import { TopicService } from '../../core/services/topic.service';
import { SchoolSubjectService } from '../../core/services/school-subject.service';
import { SchoolSubjectTopicService } from '../../core/services/school-subject-topic.service';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './assignments.component.html',
})
export class AssignmentsComponent {
  private readonly schoolSvc = inject(SchoolService);
  private readonly subjectSvc = inject(SubjectService);
  private readonly topicSvc = inject(TopicService);
  private readonly ssSvc = inject(SchoolSubjectService);
  private readonly sstSvc = inject(SchoolSubjectTopicService);

  schools = toSignal(this.schoolSvc.list(), { initialValue: [] });
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  topics = toSignal(this.topicSvc.list(), { initialValue: [] });
  schoolSubjects = toSignal(this.ssSvc.list(), { initialValue: [] });
  schoolSubjectTopics = toSignal(this.sstSvc.list(), { initialValue: [] });

  // --- Escuela -> Materia ---
  selectedSchoolId = signal('');
  selectedSubjectId = signal('');

  filteredSchoolSubjects = computed(() => {
    const schoolId = this.selectedSchoolId();
    if (!schoolId) return [];
    return this.schoolSubjects().filter((ss) => ss.schoolId === schoolId);
  });

  // --- Materia -> Tema (por escuela) ---
  selectedSSForTopics = signal(''); // schoolSubject id
  selectedTopicId = signal('');

  selectedSSDetail = computed(() => {
    const ssId = this.selectedSSForTopics();
    return this.schoolSubjects().find((ss) => ss.id === ssId) ?? null;
  });

  filteredSSTopics = computed(() => {
    const ss = this.selectedSSDetail();
    if (!ss) return [];
    return this.schoolSubjectTopics().filter(
      (sst) => sst.schoolId === ss.schoolId && sst.subjectId === ss.subjectId,
    );
  });

  // Helpers para mostrar nombres
  schoolName(id: string) {
    return this.schools().find((s) => s.id === id)?.name ?? id;
  }
  subjectName(id: string) {
    return this.subjects().find((s) => s.id === id)?.name ?? id;
  }
  topicName(id: string) {
    return this.topics().find((t) => t.id === id)?.name ?? id;
  }

  async assignSubject() {
    const schoolId = this.selectedSchoolId();
    const subjectId = this.selectedSubjectId();
    if (!schoolId || !subjectId) return;

    const exists = this.schoolSubjects().some(
      (ss) => ss.schoolId === schoolId && ss.subjectId === subjectId,
    );
    if (exists) {
      alert('Esta materia ya esta asignada a esta escuela.');
      return;
    }
    await this.ssSvc.add(schoolId, subjectId);
    this.selectedSubjectId.set('');
  }

  async removeSchoolSubject(id: string) {
    if (confirm('Quitar esta asignacion?')) {
      await this.ssSvc.delete(id);
    }
  }

  async assignTopic() {
    const ss = this.selectedSSDetail();
    const topicId = this.selectedTopicId();
    if (!ss || !topicId) return;

    const exists = this.schoolSubjectTopics().some(
      (sst) =>
        sst.schoolId === ss.schoolId &&
        sst.subjectId === ss.subjectId &&
        sst.topicId === topicId,
    );
    if (exists) {
      alert('Este tema ya esta asignado.');
      return;
    }
    await this.sstSvc.add(ss.id!, ss.schoolId, ss.subjectId, topicId);
    this.selectedTopicId.set('');
  }

  async removeSST(id: string) {
    if (confirm('Quitar este tema?')) {
      await this.sstSvc.delete(id);
    }
  }
}
