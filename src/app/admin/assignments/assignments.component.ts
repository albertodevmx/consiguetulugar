import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { SchoolService } from '../../core/services/school.service';
import { ExamTypeService } from '../../core/services/exam-type.service';
import { SubjectService } from '../../core/services/subject.service';
import { UnitService } from '../../core/services/unit.service';
import { TopicService } from '../../core/services/topic.service';
import { SchoolExamTypeService } from '../../core/services/school-exam-type.service';
import { ExamTypeSubjectService } from '../../core/services/exam-type-subject.service';
import { SubjectUnitService } from '../../core/services/subject-unit.service';
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
  private readonly setSvc = inject(SchoolExamTypeService);
  private readonly etsSvc = inject(ExamTypeSubjectService);
  private readonly suSvc = inject(SubjectUnitService);
  private readonly utSvc = inject(UnitTopicService);

  // Catalogs
  schools = toSignal(this.schoolSvc.list(), { initialValue: [] });
  examTypes = toSignal(this.examTypeSvc.list(), { initialValue: [] });
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  units = toSignal(this.unitSvc.list(), { initialValue: [] });
  topics = toSignal(this.topicSvc.list(), { initialValue: [] });

  // Assignments
  schoolExamTypes = toSignal(this.setSvc.list(), { initialValue: [] });
  examTypeSubjects = toSignal(this.etsSvc.list(), { initialValue: [] });
  subjectUnits = toSignal(this.suSvc.list(), { initialValue: [] });
  unitTopics = toSignal(this.utSvc.list(), { initialValue: [] });

  // --- Level 1: School ---
  selSchoolId = signal('');

  // --- Level 2: ExamType for school ---
  selExamTypeId = signal('');
  filteredSET = computed(() => {
    const sid = this.selSchoolId();
    if (!sid) return [];
    return this.schoolExamTypes().filter((x) => x.schoolId === sid);
  });

  // --- Level 3: Subject for school + examType ---
  selSubjectId = signal('');
  filteredETS = computed(() => {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    if (!sid || !etid) return [];
    return this.examTypeSubjects().filter(
      (x) => x.schoolId === sid && x.examTypeId === etid,
    );
  });

  // --- Level 4: Unit for school + examType + subject ---
  selUnitId = signal('');
  filteredSU = computed(() => {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    const subid = this.selSubjectId();
    if (!sid || !etid || !subid) return [];
    return this.subjectUnits().filter(
      (x) =>
        x.schoolId === sid &&
        x.examTypeId === etid &&
        x.subjectId === subid,
    );
  });

  // --- Level 5: Topic for unit ---
  selTopicId = signal('');
  filteredUT = computed(() => {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    const subid = this.selSubjectId();
    const uid = this.selUnitId();
    if (!sid || !etid || !subid || !uid) return [];
    return this.unitTopics().filter(
      (x) =>
        x.schoolId === sid &&
        x.examTypeId === etid &&
        x.subjectId === subid &&
        x.unitId === uid,
    );
  });

  // Visibility flags for template (no arrow fns in templates)
  showSubjects = computed(() => {
    const etid = this.selExamTypeId();
    return !!this.selSchoolId() && !!etid && this.filteredSET().some((x) => x.examTypeId === etid);
  });
  showUnits = computed(() => {
    const subid = this.selSubjectId();
    return this.showSubjects() && !!subid && this.filteredETS().some((x) => x.subjectId === subid);
  });
  showTopics = computed(() => {
    const uid = this.selUnitId();
    return this.showUnits() && !!uid && this.filteredSU().some((x) => x.unitId === uid);
  });

  // Name helpers
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

  // Reset downstream on change
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

  // --- Actions ---
  async assignExamType() {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    if (!sid || !etid) return;
    if (this.schoolExamTypes().some((x) => x.schoolId === sid && x.examTypeId === etid)) {
      alert('Ya asignado.');
      return;
    }
    await this.setSvc.add(sid, etid);
    this.selExamTypeId.set('');
  }

  async removeExamType(id: string) {
    if (confirm('Quitar?')) await this.setSvc.delete(id);
  }

  async assignSubject() {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    const subid = this.selSubjectId();
    if (!sid || !etid || !subid) return;
    if (
      this.examTypeSubjects().some(
        (x) =>
          x.schoolId === sid &&
          x.examTypeId === etid &&
          x.subjectId === subid,
      )
    ) {
      alert('Ya asignado.');
      return;
    }
    await this.etsSvc.add(sid, etid, subid);
    this.selSubjectId.set('');
  }

  async removeSubject(id: string) {
    if (confirm('Quitar?')) await this.etsSvc.delete(id);
  }

  async assignUnit() {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    const subid = this.selSubjectId();
    const uid = this.selUnitId();
    if (!sid || !etid || !subid || !uid) return;
    if (
      this.subjectUnits().some(
        (x) =>
          x.schoolId === sid &&
          x.examTypeId === etid &&
          x.subjectId === subid &&
          x.unitId === uid,
      )
    ) {
      alert('Ya asignado.');
      return;
    }
    await this.suSvc.add(sid, etid, subid, uid);
    this.selUnitId.set('');
  }

  async removeUnit(id: string) {
    if (confirm('Quitar?')) await this.suSvc.delete(id);
  }

  async assignTopic() {
    const sid = this.selSchoolId();
    const etid = this.selExamTypeId();
    const subid = this.selSubjectId();
    const uid = this.selUnitId();
    const tid = this.selTopicId();
    if (!sid || !etid || !subid || !uid || !tid) return;
    if (
      this.unitTopics().some(
        (x) =>
          x.schoolId === sid &&
          x.examTypeId === etid &&
          x.subjectId === subid &&
          x.unitId === uid &&
          x.topicId === tid,
      )
    ) {
      alert('Ya asignado.');
      return;
    }
    await this.utSvc.add(sid, etid, subid, uid, tid);
    this.selTopicId.set('');
  }

  async removeTopic(id: string) {
    if (confirm('Quitar?')) await this.utSvc.delete(id);
  }
}
