import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { UnitService } from '../../core/services/unit.service';
import { SubjectService } from '../../core/services/subject.service';
import { Unit } from '../../core/models';

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './units.component.html',
})
export class UnitsComponent {
  private readonly svc = inject(UnitService);
  private readonly subjectSvc = inject(SubjectService);

  units = toSignal(this.svc.list());
  subjects = toSignal(this.subjectSvc.list(), { initialValue: [] });

  name = '';
  selectedSubjectId = '';
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

  subjectName(id: string): string {
    return this.subjects().find((s) => s.id === id)?.name ?? id;
  }

  async add() {
    const trimmed = this.name.trim();
    if (!trimmed || !this.selectedSubjectId) return;
    await this.svc.add({
      name: trimmed,
      slug: this.slugify(trimmed),
      subjectId: this.selectedSubjectId,
    });
    this.name = '';
  }

  startEdit(item: Unit) {
    this.editingId.set(item.id!);
    this.editingName.set(item.name);
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
    if (confirm('Eliminar esta unidad?')) {
      await this.svc.delete(id);
    }
  }
}
