import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, SlicePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { SchoolService } from '../../core/services/school.service';
import { SubjectService } from '../../core/services/subject.service';
import { TopicService } from '../../core/services/topic.service';
import { SchoolSubjectService } from '../../core/services/school-subject.service';
import { SchoolSubjectTopicService } from '../../core/services/school-subject-topic.service';
import { QuestionService } from '../../core/services/question.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [FormsModule, AsyncPipe, SlicePipe],
  templateUrl: './questions.component.html',
})
export class QuestionsComponent {
  private readonly schoolSvc = inject(SchoolService);
  private readonly subjectSvc = inject(SubjectService);
  private readonly topicSvc = inject(TopicService);
  private readonly ssSvc = inject(SchoolSubjectService);
  private readonly sstSvc = inject(SchoolSubjectTopicService);
  private readonly qSvc = inject(QuestionService);
  private readonly storageSvc = inject(StorageService);

  questions$ = this.qSvc.list();

  schools = toSignal(this.schoolSvc.list(), { initialValue: [] });
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  topics = toSignal(this.topicSvc.list(), { initialValue: [] });
  schoolSubjects = toSignal(this.ssSvc.list(), { initialValue: [] });
  schoolSubjectTopics = toSignal(this.sstSvc.list(), { initialValue: [] });

  // Form state
  selectedSchoolId = signal('');
  selectedSubjectId = signal('');
  selectedTopicId = signal('');
  questionText = signal('');
  options = signal<string[]>(['', '', '', '']);
  correctOption = signal<number>(0);
  imageFile = signal<File | null>(null);
  saving = signal(false);
  successMsg = signal('');

  // Cascading filters
  availableSubjects = computed(() => {
    const schoolId = this.selectedSchoolId();
    if (!schoolId) return [];
    const assignedSubjectIds = this.schoolSubjects()
      .filter((ss) => ss.schoolId === schoolId)
      .map((ss) => ss.subjectId);
    return this.subjects().filter((s) => assignedSubjectIds.includes(s.id!));
  });

  availableTopics = computed(() => {
    const schoolId = this.selectedSchoolId();
    const subjectId = this.selectedSubjectId();
    if (!schoolId || !subjectId) return [];
    const assignedTopicIds = this.schoolSubjectTopics()
      .filter(
        (sst) => sst.schoolId === schoolId && sst.subjectId === subjectId,
      )
      .map((sst) => sst.topicId);
    return this.topics().filter((t) => assignedTopicIds.includes(t.id!));
  });

  // Tab state
  activeTab = signal<'list' | 'new' | 'import'>('list');

  // Import
  importJson = signal('');
  importing = signal(false);
  importMsg = signal('');

  // Helpers
  schoolName(id: string) {
    return this.schools().find((s) => s.id === id)?.name ?? id;
  }
  subjectName(id: string) {
    return this.subjects().find((s) => s.id === id)?.name ?? id;
  }
  topicName(id: string) {
    return this.topics().find((t) => t.id === id)?.name ?? id;
  }

  onSchoolChange(val: string) {
    this.selectedSchoolId.set(val);
    this.selectedSubjectId.set('');
    this.selectedTopicId.set('');
  }

  onSubjectChange(val: string) {
    this.selectedSubjectId.set(val);
    this.selectedTopicId.set('');
  }

  addOption() {
    if (this.options().length >= 5) return;
    this.options.update((opts) => [...opts, '']);
  }

  removeOption(i: number) {
    if (this.options().length <= 3) return;
    this.options.update((opts) => opts.filter((_, idx) => idx !== i));
    if (this.correctOption() >= this.options().length) {
      this.correctOption.set(0);
    }
  }

  updateOption(i: number, value: string) {
    this.options.update((opts) => {
      const copy = [...opts];
      copy[i] = value;
      return copy;
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.imageFile.set(input.files?.[0] ?? null);
  }

  async submitQuestion() {
    const text = this.questionText().trim();
    const schoolId = this.selectedSchoolId();
    const subjectId = this.selectedSubjectId();
    const topicId = this.selectedTopicId();
    const opts = this.options().map((o) => o.trim());

    if (!text || !schoolId || !subjectId || !topicId) {
      alert('Completa todos los campos obligatorios.');
      return;
    }
    if (opts.some((o) => !o)) {
      alert('Todas las opciones deben tener texto.');
      return;
    }

    this.saving.set(true);
    this.successMsg.set('');

    try {
      let imageUrl: string | undefined;
      const file = this.imageFile();
      if (file) {
        const path = `questions/${Date.now()}_${file.name}`;
        imageUrl = await this.storageSvc.uploadImage(file, path);
      }

      await this.qSvc.add({
        text,
        schoolId,
        subjectId,
        topicId,
        options: opts.map((o) => ({ text: o })),
        correctOption: this.correctOption(),
        imageUrl,
        active: true,
      });

      // Reset
      this.questionText.set('');
      this.options.set(['', '', '', '']);
      this.correctOption.set(0);
      this.imageFile.set(null);
      this.successMsg.set('Pregunta guardada correctamente.');
    } catch (err) {
      alert('Error al guardar: ' + (err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  async submitImport() {
    const raw = this.importJson().trim();
    if (!raw) return;

    this.importing.set(true);
    this.importMsg.set('');

    try {
      const questions = JSON.parse(raw);
      if (!Array.isArray(questions)) throw new Error('El JSON debe ser un array.');

      for (const q of questions) {
        if (!q.text || !q.schoolId || !q.subjectId || !q.topicId || !q.options || q.correctOption == null) {
          throw new Error('Cada pregunta debe tener: text, schoolId, subjectId, topicId, options, correctOption.');
        }
      }

      const batch = questions.map((q: any) => ({
        text: q.text,
        schoolId: q.schoolId,
        subjectId: q.subjectId,
        topicId: q.topicId,
        options: q.options.map((o: any) => (typeof o === 'string' ? { text: o } : o)),
        correctOption: q.correctOption,
        imageUrl: q.imageUrl,
        active: true,
      }));

      await this.qSvc.importBatch(batch);
      this.importMsg.set(`${batch.length} preguntas importadas correctamente.`);
      this.importJson.set('');
    } catch (err) {
      alert('Error: ' + (err as Error).message);
    } finally {
      this.importing.set(false);
    }
  }

  async removeQuestion(id: string) {
    if (confirm('Eliminar esta pregunta?')) {
      await this.qSvc.delete(id);
    }
  }
}
