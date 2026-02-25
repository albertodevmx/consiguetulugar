import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { TopicService } from '../../core/services/topic.service';
import { UnitService } from '../../core/services/unit.service';
import { UnitTopicService } from '../../core/services/unit-topic.service';
import { SubjectService } from '../../core/services/subject.service';
import { Topic } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-topics',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './topics.component.html',
})
export class TopicsComponent {
  private readonly svc = inject(TopicService);
  private readonly unitSvc = inject(UnitService);
  private readonly utSvc = inject(UnitTopicService);
  private readonly subjectSvc = inject(SubjectService);
  private readonly auth = inject(Auth);

  topics = toSignal(this.svc.list());
  units = toSignal(this.unitSvc.list(), { initialValue: [] });
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });
  unitTopics = toSignal(this.utSvc.list(), { initialValue: [] });

  name = '';
  selectedUnitId = signal('');
  editingId = signal<string | null>(null);
  editingName = signal('');

  // AI generation state
  generatingTopicId = signal<string | null>(null);
  generateCount = signal(10);
  generating = signal(false);
  generateMsg = signal('');
  generateMsgType = signal<'success' | 'error'>('success');

  /** Map topicId → unit names (a topic can belong to multiple units) */
  topicUnits = computed(() => {
    const map = new Map<string, string[]>();
    for (const ut of this.unitTopics()) {
      const unit = this.units().find((u) => u.id === ut.unitId);
      if (!unit) continue;
      const list = map.get(ut.topicId) ?? [];
      list.push(unit.name);
      map.set(ut.topicId, list);
    }
    return map;
  });

  /** Map topicId → subject name (via unit) */
  private topicSubject = computed(() => {
    const map = new Map<string, string>();
    for (const ut of this.unitTopics()) {
      const unit = this.units().find((u) => u.id === ut.unitId);
      if (!unit) continue;
      const subject = this.subjects().find((s) => s.id === unit.subjectId);
      if (subject) map.set(ut.topicId, subject.name);
    }
    return map;
  });

  slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async add() {
    const trimmed = this.name.trim();
    const unitId = this.selectedUnitId();
    if (!trimmed || !unitId) return;

    const docRef = await this.svc.add({ name: trimmed, slug: this.slugify(trimmed) });
    await this.utSvc.add(unitId, docRef.id);

    this.name = '';
    this.selectedUnitId.set('');
  }

  startEdit(topic: Topic) {
    this.editingId.set(topic.id!);
    this.editingName.set(topic.name);
  }

  async saveEdit(id: string) {
    const trimmed = this.editingName().trim();
    if (!trimmed) return;
    await this.svc.update(id, { name: trimmed, slug: this.slugify(trimmed) });
    this.editingId.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  async remove(id: string) {
    if (confirm('Eliminar este tema?')) {
      await this.svc.delete(id);
    }
  }

  // --- AI Generation ---

  openGenerate(topic: Topic) {
    this.generatingTopicId.set(topic.id!);
    this.generateCount.set(10);
    this.generateMsg.set('');
  }

  closeGenerate() {
    this.generatingTopicId.set(null);
    this.generateMsg.set('');
  }

  async executeGenerate(topicId: string, topicName: string) {
    const count = this.generateCount();
    if (count < 1 || count > 20) {
      this.generateMsg.set('El numero debe estar entre 1 y 20.');
      this.generateMsgType.set('error');
      return;
    }

    this.generating.set(true);
    this.generateMsg.set('');

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No has iniciado sesion.');
      const token = await user.getIdToken();

      const subjectName = this.topicSubject().get(topicId) ?? '';

      const response = await fetch(
        `${environment.functionsUrl}/generateQuestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topicId,
            topicName,
            count,
            context: subjectName,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error de conexion' }));
        throw new Error(err.error || 'Error al generar preguntas');
      }

      const { generated } = await response.json();
      this.generateMsg.set(`${generated} preguntas generadas correctamente.`);
      this.generateMsgType.set('success');
    } catch (e) {
      this.generateMsg.set((e as Error).message);
      this.generateMsgType.set('error');
    } finally {
      this.generating.set(false);
    }
  }
}
