import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { SchoolService } from '../../core/services/school.service';
import { ExamTypeService } from '../../core/services/exam-type.service';
import { SubjectService } from '../../core/services/subject.service';
import { UnitService } from '../../core/services/unit.service';
import { TopicService } from '../../core/services/topic.service';
import { ExamTypeSubjectService } from '../../core/services/exam-type-subject.service';
import { UnitTopicService } from '../../core/services/unit-topic.service';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './assignments.component.html',
})
export class AssignmentsComponent {
  private readonly schoolSvc = inject(SchoolService);
  private readonly examTypeSvc = inject(ExamTypeService);
  private readonly subjectSvc = inject(SubjectService);
  private readonly unitSvc = inject(UnitService);
  private readonly topicSvc = inject(TopicService);
  private readonly etsSvc = inject(ExamTypeSubjectService);
  private readonly utSvc = inject(UnitTopicService);

  /* ── Catalogs ── */
  schools = toSignal(this.schoolSvc.list(), { initialValue: [] });
  examTypes = toSignal(this.examTypeSvc.list(), { initialValue: [] });
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  units = toSignal(this.unitSvc.list(), { initialValue: [] });
  topics = toSignal(this.topicSvc.list(), { initialValue: [] });

  /* ── Assignment tables ── */
  examTypeSubjects = toSignal(this.etsSvc.list(), { initialValue: [] });
  unitTopics = toSignal(this.utSvc.list(), { initialValue: [] });

  /* ── Selections ── */
  selSchoolId = signal('');
  selExamTypeId = signal('');
  selSubjectId = signal('');
  selUnitId = signal('');
  selTopicId = signal('');

  /* ── Level 2: ExamTypes filtered by school (direct relationship) ── */
  filteredExamTypes = computed(() => {
    const sid = this.selSchoolId();
    if (!sid) return [];
    return this.examTypes().filter((et) => et.schoolId === sid);
  });

  /* ── Level 3: Subjects assigned to selected examType ── */
  filteredETS = computed(() => {
    const etId = this.selExamTypeId();
    if (!etId) return [];
    return this.examTypeSubjects().filter((x) => x.examTypeId === etId);
  });

  /* ── Level 4: Units filtered by subject (direct relationship) ── */
  filteredUnits = computed(() => {
    const subId = this.selSubjectId();
    if (!subId) return [];
    return this.units().filter((u) => u.subjectId === subId);
  });

  /* ── Level 5: Topics assigned to selected unit ── */
  filteredUT = computed(() => {
    const uid = this.selUnitId();
    if (!uid) return [];
    return this.unitTopics().filter((x) => x.unitId === uid);
  });

  /* ── Visibility (no arrow fns in templates) ── */
  showSubjects = computed(() => !!this.selSchoolId() && !!this.selExamTypeId());

  showUnits = computed(() => {
    const subId = this.selSubjectId();
    return (
      this.showSubjects() &&
      !!subId &&
      this.filteredETS().some((x) => x.subjectId === subId)
    );
  });

  showTopics = computed(() => this.showUnits() && !!this.selUnitId());

  /* ── Name helpers ── */
  schoolName(id: string) {
    return this.schools().find((s) => s.id === id)?.name ?? id;
  }
  examTypeName(id: string) {
    return this.examTypes().find((e) => e.id === id)?.name ?? id;
  }
  subjectName(id: string) {
    return this.subjects().find((s) => s.id === id)?.name ?? id;
  }
  unitName(id: string) {
    return this.units().find((u) => u.id === id)?.name ?? id;
  }
  topicName(id: string) {
    return this.topics().find((t) => t.id === id)?.name ?? id;
  }

  /* ── Reset downstream on change ── */
  onSchoolChange(v: string) {
    this.selSchoolId.set(v);
    this.selExamTypeId.set('');
    this.selSubjectId.set('');
    this.selUnitId.set('');
    this.selTopicId.set('');
  }

  onExamTypeChange(v: string) {
    this.selExamTypeId.set(v);
    this.selSubjectId.set('');
    this.selUnitId.set('');
    this.selTopicId.set('');
  }

  onSubjectChange(v: string) {
    this.selSubjectId.set(v);
    this.selUnitId.set('');
    this.selTopicId.set('');
  }

  onUnitChange(v: string) {
    this.selUnitId.set(v);
    this.selTopicId.set('');
  }

  /* ── Actions ── */
  async assignSubject() {
    const etId = this.selExamTypeId();
    const subId = this.selSubjectId();
    if (!etId || !subId) return;
    if (
      this.examTypeSubjects().some(
        (x) => x.examTypeId === etId && x.subjectId === subId,
      )
    ) {
      alert('Ya asignado.');
      return;
    }
    await this.etsSvc.add(etId, subId);
    this.selSubjectId.set('');
  }

  async removeSubject(id: string) {
    if (confirm('Quitar?')) await this.etsSvc.delete(id);
  }

  async assignTopic() {
    const uid = this.selUnitId();
    const tid = this.selTopicId();
    if (!uid || !tid) return;
    if (
      this.unitTopics().some((x) => x.unitId === uid && x.topicId === tid)
    ) {
      alert('Ya asignado.');
      return;
    }
    await this.utSvc.add(uid, tid);
    this.selTopicId.set('');
  }

  async removeTopic(id: string) {
    if (confirm('Quitar?')) await this.utSvc.delete(id);
  }
}
