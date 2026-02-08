import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TopicService } from '../../core/services/topic.service';
import { UnitService } from '../../core/services/unit.service';
import { UnitTopicService } from '../../core/services/unit-topic.service';
import { Topic } from '../../core/models';

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

  topics = toSignal(this.svc.list(), { initialValue: [] });
  units = toSignal(this.unitSvc.list(), { initialValue: [] });
  unitTopics = toSignal(this.utSvc.list(), { initialValue: [] });

  name = '';
  selectedUnitId = signal('');
  editingId = signal<string | null>(null);
  editingName = signal('');

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
}
