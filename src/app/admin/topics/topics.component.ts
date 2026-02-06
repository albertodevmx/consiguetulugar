import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { TopicService } from '../../core/services/topic.service';
import { Topic } from '../../core/models';

@Component({
  selector: 'app-topics',
  standalone: true,
  imports: [FormsModule, AsyncPipe],
  templateUrl: './topics.component.html',
})
export class TopicsComponent {
  private readonly svc = inject(TopicService);

  topics$ = this.svc.list();
  name = '';
  editingId = signal<string | null>(null);
  editingName = signal('');

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
    if (!trimmed) return;
    await this.svc.add({ name: trimmed, slug: this.slugify(trimmed) });
    this.name = '';
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
