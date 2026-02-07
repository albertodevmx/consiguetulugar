import { Component, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { SchoolService } from '../../core/services/school.service';
import { ExamTypeService } from '../../core/services/exam-type.service';
import { ExamTypeSubjectService } from '../../core/services/exam-type-subject.service';
import { SubjectService } from '../../core/services/subject.service';
import { UnitService } from '../../core/services/unit.service';
import { TopicService } from '../../core/services/topic.service';
import { UnitTopicService } from '../../core/services/unit-topic.service';
import { QuestionService } from '../../core/services/question.service';
import { Question } from '../../core/models';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './practice.component.html',
  styleUrl: './practice.component.scss',
})
export class PracticeComponent {
  private schoolSvc = inject(SchoolService);
  private examTypeSvc = inject(ExamTypeService);
  private etsSvc = inject(ExamTypeSubjectService);
  private subjectSvc = inject(SubjectService);
  private unitSvc = inject(UnitService);
  private topicSvc = inject(TopicService);
  private unitTopicSvc = inject(UnitTopicService);
  private questionSvc = inject(QuestionService);

  /* ── catalogues ── */
  schools = toSignal(this.schoolSvc.list(), { initialValue: [] });
  examTypes = toSignal(this.examTypeSvc.list(), { initialValue: [] });
  examTypeSubjects = toSignal(this.etsSvc.list(), { initialValue: [] });
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  units = toSignal(this.unitSvc.list(), { initialValue: [] });
  topics = toSignal(this.topicSvc.list(), { initialValue: [] });
  unitTopics = toSignal(this.unitTopicSvc.list(), { initialValue: [] });

  /* ── user selections ── */
  selSchoolId = signal('');
  selSubjectId = signal('');
  selTopicId = signal('');

  /* ── derived: subjects for selected school ── */
  /* School → ExamTypes (schoolId) → ExamTypeSubjects → Subjects */
  availableSubjects = computed(() => {
    const schoolId = this.selSchoolId();
    if (!schoolId) return [];
    const etIds = new Set(
      this.examTypes()
        .filter((et) => et.schoolId === schoolId)
        .map((et) => et.id!),
    );
    const subjectIds = new Set(
      this.examTypeSubjects()
        .filter((ets) => etIds.has(ets.examTypeId))
        .map((ets) => ets.subjectId),
    );
    return this.subjects().filter((s) => subjectIds.has(s.id!));
  });

  /* ── derived: topics for selected subject ── */
  /* Subject → Units (subjectId) → UnitTopics → Topics */
  availableTopics = computed(() => {
    const subjectId = this.selSubjectId();
    if (!subjectId) return [];
    const unitIds = new Set(
      this.units()
        .filter((u) => u.subjectId === subjectId)
        .map((u) => u.id!),
    );
    const topicIds = new Set(
      this.unitTopics()
        .filter((ut) => unitIds.has(ut.unitId))
        .map((ut) => ut.topicId),
    );
    return this.topics().filter((t) => topicIds.has(t.id!));
  });

  /* ── question state ── */
  questions = signal<Question[]>([]);
  currentIndex = signal(0);
  selectedOption = signal<number | null>(null);
  answered = signal(false);
  loading = signal(false);
  sessionFinished = signal(false);
  correctCount = signal(0);
  totalAnswered = signal(0);

  currentQuestion = computed(() => {
    const qs = this.questions();
    const idx = this.currentIndex();
    return idx < qs.length ? qs[idx] : null;
  });

  remainingCount = computed(() =>
    Math.max(0, this.questions().length - this.currentIndex()),
  );

  /* ── selector handlers ── */
  onSchoolChange(id: string) {
    this.selSchoolId.set(id);
    this.selSubjectId.set('');
    this.selTopicId.set('');
    this.resetQuiz();
  }

  onSubjectChange(id: string) {
    this.selSubjectId.set(id);
    this.selTopicId.set('');
    this.resetQuiz();
  }

  onTopicChange(id: string) {
    this.selTopicId.set(id);
    this.resetQuiz();
    if (id) {
      this.loadQuestions(id);
    }
  }

  /* ── question interaction ── */
  selectOption(idx: number) {
    if (!this.answered()) {
      this.selectedOption.set(idx);
    }
  }

  submitAnswer() {
    if (this.selectedOption() === null || this.answered()) return;
    this.answered.set(true);
    this.totalAnswered.update((n) => n + 1);
    const q = this.currentQuestion();
    if (q && this.selectedOption() === q.correctOption) {
      this.correctCount.update((n) => n + 1);
    }
  }

  nextQuestion() {
    const next = this.currentIndex() + 1;
    if (next < this.questions().length) {
      this.currentIndex.set(next);
      this.selectedOption.set(null);
      this.answered.set(false);
    } else {
      this.sessionFinished.set(true);
    }
  }

  restartTopic() {
    this.resetQuiz();
    const topicId = this.selTopicId();
    if (topicId) {
      this.loadQuestions(topicId);
    }
  }

  /* ── helpers ── */
  optionClass(idx: number, correctIdx: number): string {
    if (!this.answered()) {
      return this.selectedOption() === idx
        ? 'btn-secondary'
        : 'btn-outline-secondary';
    }
    if (idx === correctIdx) return 'btn-success';
    if (this.selectedOption() === idx) return 'btn-danger';
    return 'btn-outline-secondary';
  }

  optionLetter(idx: number): string {
    return String.fromCharCode(65 + idx);
  }

  private loadQuestions(topicId: string) {
    this.loading.set(true);
    this.questionSvc
      .listByTopic(topicId)
      .pipe(take(1))
      .subscribe((qs) => {
        const active = qs.filter((q) => q.active);
        this.questions.set(this.shuffle(active));
        this.currentIndex.set(0);
        this.loading.set(false);
        if (active.length === 0) {
          this.sessionFinished.set(true);
        }
      });
  }

  private resetQuiz() {
    this.questions.set([]);
    this.currentIndex.set(0);
    this.selectedOption.set(null);
    this.answered.set(false);
    this.sessionFinished.set(false);
    this.correctCount.set(0);
    this.totalAnswered.set(0);
    this.loading.set(false);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
