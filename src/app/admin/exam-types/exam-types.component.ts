import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExamTypeService } from '../../core/services/exam-type.service';
import { SchoolService } from '../../core/services/school.service';
import { ExamType } from '../../core/models';

@Component({
  selector: 'app-exam-types',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './exam-types.component.html',
})
export class ExamTypesComponent {
  private readonly svc = inject(ExamTypeService);
  private readonly schoolSvc = inject(SchoolService);

  examTypes = toSignal(this.svc.list(), { initialValue: [] });
  schools = toSignal(this.schoolSvc.list(), { initialValue: [] });

  name = '';
  selectedSchoolId = '';
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

  schoolName(id: string): string {
    return this.schools().find((s) => s.id === id)?.name ?? id;
  }

  async add() {
    const trimmed = this.name.trim();
    if (!trimmed || !this.selectedSchoolId) return;
    await this.svc.add({
      name: trimmed,
      slug: this.slugify(trimmed),
      schoolId: this.selectedSchoolId,
    });
    this.name = '';
  }

  startEdit(item: ExamType) {
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
    if (confirm('Eliminar este tipo de examen?')) {
      await this.svc.delete(id);
    }
  }
}
