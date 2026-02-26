import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { PreguntaService } from '../../core/services/pregunta.service';
import { MateriaService } from '../../core/services/materia.service';
import { TemaService } from '../../core/services/tema.service';
import { Pregunta } from '../../core/models';

@Component({
  selector: 'app-preguntas',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  template: `
    <h2>Preguntas</h2>

    <!-- Filters -->
    <div class="row g-2 mb-3">
      <div class="col-auto">
        <select class="form-select form-select-sm" [ngModel]="filterMateriaId()"
          (ngModelChange)="filterMateriaId.set($event)" name="fMat">
          <option value="">Todas las materias</option>
          @for (m of materias(); track m.id) {
            <option [value]="m.id">{{ m.nombre_canonical }}</option>
          }
        </select>
      </div>
      <div class="col-auto">
        <select class="form-select form-select-sm" [ngModel]="filterTemaId()"
          (ngModelChange)="filterTemaId.set($event)" name="fTema"
          [disabled]="!filterMateriaId()">
          <option value="">Todos los temas</option>
          @for (t of temas(); track t.id) {
            <option [value]="t.id">{{ t.nombre_canonical }}</option>
          }
        </select>
      </div>
      <div class="col-auto">
        <input class="form-control form-control-sm" [(ngModel)]="searchText"
          name="search" placeholder="Buscar texto..." style="min-width:200px" />
      </div>
    </div>

    <!-- Bulk actions -->
    @if (selectedIds().size > 0) {
      <div class="alert alert-warning d-flex align-items-center gap-2 py-2">
        <strong>{{ selectedIds().size }} seleccionadas</strong>
        <button class="btn btn-sm btn-danger" (click)="deleteSelected()" [disabled]="deleting()">
          @if (deleting()) {
            <span class="spinner-border spinner-border-sm me-1"></span>
          }
          Eliminar seleccion
        </button>
        <button class="btn btn-sm btn-outline-secondary" (click)="clearSelection()">Deseleccionar</button>
      </div>
    }

    @if (loading()) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary"><span class="visually-hidden">Cargando...</span></div>
      </div>
    } @else if (filtered().length === 0) {
      <p class="text-muted">No se encontraron preguntas.</p>
    } @else {
      <p class="text-muted small">Mostrando {{ filtered().length }} de {{ preguntas()?.length ?? 0 }} preguntas</p>

      <table class="table table-sm table-striped">
        <thead>
          <tr>
            <th style="width:40px">
              <input type="checkbox" class="form-check-input" [checked]="allSelected()"
                (change)="toggleAll()" />
            </th>
            <th>Texto</th>
            <th style="width:100px">Opciones</th>
            <th style="width:80px">Dificultad</th>
            <th style="width:80px">Creada</th>
            <th style="width:160px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (p of filtered(); track p.id) {
            <tr [class.table-info]="editingId() === p.id">
              <td>
                <input type="checkbox" class="form-check-input"
                  [checked]="selectedIds().has(p.id!)"
                  (change)="toggleSelect(p.id!)" />
              </td>
              <td>
                @if (editingId() === p.id) {
                  <textarea class="form-control form-control-sm" rows="2"
                    [ngModel]="editTexto()" (ngModelChange)="editTexto.set($event)"
                    [ngModelOptions]="{standalone:true}"></textarea>
                } @else {
                  <span class="small">{{ p.texto | slice:0:120 }}{{ p.texto.length > 120 ? '...' : '' }}</span>
                }
              </td>
              <td class="text-center">{{ p.opciones?.length ?? 0 }}</td>
              <td class="text-center">
                @if (editingId() === p.id) {
                  <select class="form-select form-select-sm" [ngModel]="editDificultad()"
                    (ngModelChange)="editDificultad.set($event)" [ngModelOptions]="{standalone:true}">
                    <option [ngValue]="1">1</option>
                    <option [ngValue]="2">2</option>
                    <option [ngValue]="3">3</option>
                  </select>
                } @else {
                  @switch (p.dificultad) {
                    @case (1) { <span class="badge bg-success">Facil</span> }
                    @case (2) { <span class="badge bg-warning text-dark">Media</span> }
                    @case (3) { <span class="badge bg-danger">Dificil</span> }
                  }
                }
              </td>
              <td class="small">{{ p.creada_por }}</td>
              <td>
                @if (editingId() === p.id) {
                  <button class="btn btn-sm btn-success me-1" (click)="saveEdit(p.id!)">Guardar</button>
                  <button class="btn btn-sm btn-secondary" (click)="editingId.set(null)">Cancelar</button>
                } @else {
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="startEdit(p)">Editar</button>
                  <button class="btn btn-sm btn-outline-danger" (click)="remove(p.id!)">Eliminar</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }

    @if (msg()) {
      <div class="alert mt-3" [class.alert-success]="msgOk()" [class.alert-danger]="!msgOk()">
        {{ msg() }}
      </div>
    }
  `,
})
export class PreguntasComponent {
  private readonly preguntaSvc = inject(PreguntaService);
  private readonly materiaSvc = inject(MateriaService);
  private readonly temaSvc = inject(TemaService);

  materias = toSignal(this.materiaSvc.list(), { initialValue: [] });

  filterMateriaId = signal('');
  filterTemaId = signal('');
  searchText = '';

  temas = toSignal(
    toObservable(this.filterMateriaId).pipe(
      switchMap((id) => (id ? this.temaSvc.listByMateria(id) : of([]))),
    ),
    { initialValue: [] },
  );

  preguntas = toSignal(
    toObservable(this.filterMateriaId).pipe(
      switchMap((matId) => {
        if (matId) return this.preguntaSvc.adminListByMateria(matId);
        return this.preguntaSvc.adminListAll(300);
      }),
    ),
  );

  loading = computed(() => this.preguntas() === undefined);

  filtered = computed(() => {
    let list = this.preguntas() ?? [];
    const temaId = this.filterTemaId();
    if (temaId) list = list.filter((p) => p.tema_id === temaId);
    const search = this.searchText.toLowerCase().trim();
    if (search) list = list.filter((p) => p.texto.toLowerCase().includes(search));
    return list;
  });

  // Selection
  selectedIds = signal(new Set<string>());

  allSelected = computed(() => {
    const f = this.filtered();
    const s = this.selectedIds();
    return f.length > 0 && f.every((p) => s.has(p.id!));
  });

  toggleSelect(id: string) {
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }

  toggleAll() {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.filtered().map((p) => p.id!)));
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  // Edit
  editingId = signal<string | null>(null);
  editTexto = signal('');
  editDificultad = signal<1 | 2 | 3>(2);

  startEdit(p: Pregunta) {
    this.editingId.set(p.id!);
    this.editTexto.set(p.texto);
    this.editDificultad.set(p.dificultad);
  }

  async saveEdit(id: string) {
    await this.preguntaSvc.update(id, {
      texto: this.editTexto().trim(),
      dificultad: this.editDificultad(),
    });
    this.editingId.set(null);
    this.msg.set('Pregunta actualizada.');
    this.msgOk.set(true);
  }

  // Delete
  deleting = signal(false);
  msg = signal('');
  msgOk = signal(true);

  async remove(id: string) {
    if (confirm('Eliminar esta pregunta?')) {
      await this.preguntaSvc.delete(id);
      this.msg.set('Pregunta eliminada.');
      this.msgOk.set(true);
    }
  }

  async deleteSelected() {
    const ids = [...this.selectedIds()];
    if (!confirm(`Eliminar ${ids.length} preguntas?`)) return;
    this.deleting.set(true);
    try {
      await this.preguntaSvc.deleteBatch(ids);
      this.msg.set(`${ids.length} preguntas eliminadas.`);
      this.msgOk.set(true);
      this.selectedIds.set(new Set());
    } catch (e) {
      this.msg.set('Error: ' + (e as Error).message);
      this.msgOk.set(false);
    } finally {
      this.deleting.set(false);
    }
  }
}
