import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExamenService } from '../../core/services/examen.service';
import { Examen } from '../../core/models';

@Component({
  selector: 'app-examenes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Examenes</h2>

    <!-- Filtro por escuela -->
    <div class="d-flex gap-2 mb-3">
      <select class="form-select" style="max-width:250px"
        [ngModel]="filterEscuela()" (ngModelChange)="filterEscuela.set($event)" name="filterEsc">
        <option value="">Todas las escuelas</option>
        @for (e of escuelas(); track e) {
          <option [value]="e">{{ e }}</option>
        }
      </select>
    </div>

    <!-- Agregar examen -->
    <div class="card mb-4">
      <div class="card-body">
        <h6 class="card-title">Agregar examen</h6>
        <div class="row g-2">
          <div class="col-auto">
            <input class="form-control form-control-sm" [(ngModel)]="newEscuela"
              name="newEsc" placeholder="Escuela (ej: UNAM)" />
          </div>
          <div class="col-auto">
            <input class="form-control form-control-sm" [(ngModel)]="newNombre"
              name="newNom" placeholder="Nombre del examen" />
          </div>
          <div class="col-auto">
            <input class="form-control form-control-sm" [(ngModel)]="newArea"
              name="newArea" placeholder="Area (ej: Area 1)" />
          </div>
          <div class="col-auto">
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newAnio"
              name="newAnio" placeholder="Año" style="width:90px" />
          </div>
          <div class="col-auto">
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newTotal"
              name="newTotal" placeholder="Reactivos" style="width:100px" />
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-primary" (click)="addExamen()"
              [disabled]="!newEscuela.trim() || !newNombre.trim()">Agregar</button>
          </div>
        </div>
      </div>
    </div>

    @if (examenes() === undefined) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary"><span class="visually-hidden">Cargando...</span></div>
      </div>
    } @else if (filtered().length === 0) {
      <p class="text-muted">No hay examenes registrados.</p>
    } @else {
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Escuela</th>
            <th>Nombre</th>
            <th>Area</th>
            <th>Año</th>
            <th>Reactivos</th>
            <th style="width:200px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (ex of filtered(); track ex.id) {
            <tr>
              <td>{{ ex.escuela }}</td>
              <td>
                @if (editingId() === ex.id) {
                  <input class="form-control form-control-sm" [ngModel]="editNombre()"
                    (ngModelChange)="editNombre.set($event)" [ngModelOptions]="{standalone:true}" />
                } @else {
                  {{ ex.nombre }}
                }
              </td>
              <td>
                @if (editingId() === ex.id) {
                  <input class="form-control form-control-sm" [ngModel]="editArea()"
                    (ngModelChange)="editArea.set($event)" [ngModelOptions]="{standalone:true}" />
                } @else {
                  {{ ex.area }}
                }
              </td>
              <td>{{ ex['año'] }}</td>
              <td>{{ ex.total_reactivos }}</td>
              <td>
                @if (editingId() === ex.id) {
                  <button class="btn btn-sm btn-success me-1" (click)="saveEdit(ex.id!)">Guardar</button>
                  <button class="btn btn-sm btn-secondary" (click)="editingId.set(null)">Cancelar</button>
                } @else {
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="startEdit(ex)">Editar</button>
                  <button class="btn btn-sm btn-outline-danger" (click)="remove(ex.id!)">Eliminar</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class ExamenesComponent {
  private readonly svc = inject(ExamenService);

  examenes = toSignal(this.svc.list());
  filterEscuela = signal('');

  escuelas = computed(() => {
    const list = this.examenes() ?? [];
    return [...new Set(list.map((e) => e.escuela))].sort();
  });

  filtered = computed(() => {
    const all = this.examenes() ?? [];
    const esc = this.filterEscuela();
    return esc ? all.filter((e) => e.escuela === esc) : all;
  });

  // Add form
  newEscuela = '';
  newNombre = '';
  newArea = '';
  newAnio = new Date().getFullYear();
  newTotal = 120;

  // Edit
  editingId = signal<string | null>(null);
  editNombre = signal('');
  editArea = signal('');

  async addExamen() {
    if (!this.newEscuela.trim() || !this.newNombre.trim()) return;
    await this.svc.add({
      escuela: this.newEscuela.trim(),
      nombre: this.newNombre.trim(),
      area: this.newArea.trim(),
      año: this.newAnio,
      total_reactivos: this.newTotal,
      distribucion: {},
      archivo_guia_url: null,
    });
    this.newNombre = '';
    this.newArea = '';
  }

  startEdit(ex: Examen) {
    this.editingId.set(ex.id!);
    this.editNombre.set(ex.nombre);
    this.editArea.set(ex.area);
  }

  async saveEdit(id: string) {
    await this.svc.update(id, {
      nombre: this.editNombre().trim(),
      area: this.editArea().trim(),
    });
    this.editingId.set(null);
  }

  async remove(id: string) {
    if (confirm('Eliminar este examen?')) {
      await this.svc.delete(id);
    }
  }
}
