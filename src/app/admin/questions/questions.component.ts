import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, SlicePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TopicService } from '../../core/services/topic.service';
import { QuestionService } from '../../core/services/question.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [FormsModule, AsyncPipe, SlicePipe],
  templateUrl: './questions.component.html',
})
export class QuestionsComponent {
  private readonly topicSvc = inject(TopicService);
  private readonly qSvc = inject(QuestionService);
  private readonly storageSvc = inject(StorageService);

  questions$ = this.qSvc.list();
  topics = toSignal(this.topicSvc.list(), { initialValue: [] });

  // Form state
  selectedTopicId = signal('');
  questionText = signal('');
  options = signal<string[]>(['', '', '', '']);
  correctOption = signal<number>(0);
  imageFile = signal<File | null>(null);
  saving = signal(false);
  successMsg = signal('');

  // Tab state
  activeTab = signal<'list' | 'new' | 'import'>('list');

  // Import
  importJson = signal('');
  importing = signal(false);
  importMsg = signal('');

  // Helpers
  topicName(id: string) {
    return this.topics().find((t) => t.id === id)?.name ?? id;
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
    const topicId = this.selectedTopicId();
    const opts = this.options().map((o) => o.trim());

    if (!text || !topicId) {
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

      const questionData: any = {
        text,
        topicId,
        options: opts.map((o) => ({ text: o })),
        correctOption: this.correctOption(),
        active: true,
      };
      if (imageUrl) questionData.imageUrl = imageUrl;

      await this.qSvc.add(questionData);

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
      if (!Array.isArray(questions))
        throw new Error('El JSON debe ser un array.');

      for (const q of questions) {
        if (!q.text || !q.topicId || !q.options || q.correctOption == null) {
          throw new Error(
            'Cada pregunta debe tener: text, topicId, options, correctOption.',
          );
        }
      }

      const batch = questions.map((q: any) => {
        const item: any = {
          text: q.text,
          topicId: q.topicId,
          options: q.options.map((o: any) =>
            typeof o === 'string' ? { text: o } : o,
          ),
          correctOption: q.correctOption,
          active: true,
        };
        if (q.imageUrl) item.imageUrl = q.imageUrl;
        return item;
      });

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
