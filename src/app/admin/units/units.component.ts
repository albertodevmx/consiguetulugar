import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { UnitService } from '../../core/services/unit.service';
import { Unit } from '../../core/models';

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [FormsModule, AsyncPipe],
  templateUrl: './units.component.html',
})
export class UnitsComponent {
  private readonly svc = inject(UnitService);

  units$ = this.svc.list();
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
