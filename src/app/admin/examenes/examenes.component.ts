import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';
import { MateriaService } from '../../core/services/materia.service';
import { TemaService } from '../../core/services/tema.service';
import { Examen, MateriaMapping } from '../../core/models';

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
              name="newArea" placeholder="Area (ej: Area 2)" />
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
            <th style="width:280px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (ex of filtered(); track ex.id) {
            <tr [class.table-active]="selectedExamenId() === ex.id">
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
                  <button class="btn btn-sm btn-outline-info me-1"
                    (click)="selectExamen(ex)"
                    [class.btn-info]="selectedExamenId() === ex.id"
                    [class.text-white]="selectedExamenId() === ex.id">
                    Materias
                  </button>
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="startEdit(ex)">Editar</button>
                  <button class="btn btn-sm btn-outline-danger" (click)="remove(ex.id!)">Eliminar</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }

    <!-- Panel de materias_mapping -->
    @if (selectedExamenId()) {
      <div class="card mt-4 border-info">
        <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-link-45deg me-1"></i> Materias asignadas a: {{ selectedExamenNombre() }}</span>
          <button class="btn btn-sm btn-light" (click)="selectedExamenId.set(null)">Cerrar</button>
        </div>
        <div class="card-body">

          <!-- Agregar materia mapping -->
          <div class="row g-2 mb-3 align-items-end">
            <div class="col-auto">
              <label class="form-label mb-0 small">Materia</label>
              <select class="form-select form-select-sm" [(ngModel)]="newMapMateriaId" name="newMapMat">
                <option value="">-- Seleccionar --</option>
                @for (m of allMaterias(); track m.id) {
                  <option [value]="m.id">{{ m.nombre_canonical }}</option>
                }
              </select>
            </div>
            <div class="col-auto">
              <label class="form-label mb-0 small">Nombre en guia</label>
              <input class="form-control form-control-sm" [(ngModel)]="newMapNombreGuia"
                name="newMapNom" placeholder="ej: Matematicas" />
            </div>
            <div class="col-auto">
              <label class="form-label mb-0 small">Reactivos</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="newMapReactivos"
                name="newMapReact" style="width:80px" />
            </div>
            <div class="col-auto">
              <button class="btn btn-sm btn-primary" (click)="addMapping()"
                [disabled]="!newMapMateriaId || !newMapNombreGuia.trim()">Agregar</button>
            </div>
          </div>

          @if (mappings() === undefined) {
            <div class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-info"></div>
            </div>
          } @else if (mappings()!.length === 0) {
            <p class="text-muted mb-0">No hay materias asignadas. Agrega una arriba.</p>
          } @else {
            <table class="table table-sm table-bordered mb-0">
              <thead>
                <tr>
                  <th>Materia (ID)</th>
                  <th>Nombre en guia</th>
                  <th>Reactivos</th>
                  <th>Temas vinculados</th>
                  <th style="width:160px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (mm of mappings(); track mm.id) {
                  <tr>
                    <td>
                      <small class="text-muted">{{ materiaName(mm.materia_id) }}</small>
                    </td>
                    <td>
                      @if (editingMapId() === mm.id) {
                        <input class="form-control form-control-sm" [ngModel]="editMapNombre()"
                          (ngModelChange)="editMapNombre.set($event)" [ngModelOptions]="{standalone:true}" />
                      } @else {
                        {{ mm.nombre_en_guia }}
                      }
                    </td>
                    <td>
                      @if (editingMapId() === mm.id) {
                        <input type="number" class="form-control form-control-sm" [ngModel]="editMapReactivos()"
                          (ngModelChange)="editMapReactivos.set($event)" [ngModelOptions]="{standalone:true}"
                          style="width:80px" />
                      } @else {
                        {{ mm.num_reactivos }}
                      }
                    </td>
                    <td>
                      <button class="btn btn-sm btn-outline-secondary"
                        (click)="toggleTemasPanel(mm)"
                        [class.btn-secondary]="temasMapId() === mm.id"
                        [class.text-white]="temasMapId() === mm.id">
                        {{ (mm.temas_mapping || []).length }} temas
                      </button>
                    </td>
                    <td>
                      @if (editingMapId() === mm.id) {
                        <button class="btn btn-sm btn-success me-1" (click)="saveMapping(mm.id!)">Guardar</button>
                        <button class="btn btn-sm btn-secondary" (click)="editingMapId.set(null)">Cancelar</button>
                      } @else {
                        <button class="btn btn-sm btn-outline-primary me-1" (click)="startEditMapping(mm)">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" (click)="removeMapping(mm.id!)">Eliminar</button>
                      }
                    </td>
                  </tr>

                  <!-- Temas mapping sub-panel -->
                  @if (temasMapId() === mm.id) {
                    <tr>
                      <td colspan="5" class="bg-light p-3">
                        <strong class="d-block mb-2">Temas vinculados a "{{ mm.nombre_en_guia }}"</strong>

                        <!-- Add tema mapping -->
                        <div class="row g-2 mb-2 align-items-end">
                          <div class="col-auto">
                            <select class="form-select form-select-sm" [(ngModel)]="newTemaMappingId"
                              [ngModelOptions]="{standalone:true}">
                              <option value="">-- Tema --</option>
                              @for (t of temasForMateria(); track t.id) {
                                <option [value]="t.id">{{ t.nombre_canonical }}</option>
                              }
                            </select>
                          </div>
                          <div class="col-auto">
                            <input class="form-control form-control-sm" [(ngModel)]="newTemaMappingNombre"
                              [ngModelOptions]="{standalone:true}" placeholder="Nombre en guia" />
                          </div>
                          <div class="col-auto">
                            <button class="btn btn-sm btn-primary" (click)="addTemaMapping(mm)"
                              [disabled]="!newTemaMappingId || !newTemaMappingNombre.trim()">Agregar tema</button>
                          </div>
                        </div>

                        @if ((mm.temas_mapping || []).length === 0) {
                          <p class="text-muted small mb-0">Sin temas vinculados.</p>
                        } @else {
                          <ul class="list-group list-group-flush">
                            @for (tm of mm.temas_mapping; track tm.tema_id) {
                              <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
                                <span><small class="text-muted me-2">{{ tm.tema_id }}</small> {{ tm.nombre_en_guia }}</span>
                                <button class="btn btn-sm btn-outline-danger py-0" (click)="removeTemaMapping(mm, tm.tema_id)">
                                  <i class="bi bi-x"></i>
                                </button>
                              </li>
                            }
                          </ul>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    }
  `,
})
export class ExamenesComponent {
  private readonly svc = inject(ExamenService);
  private readonly materiaSvc = inject(MateriaService);
  private readonly temaSvc = inject(TemaService);

  examenes = toSignal(this.svc.list());
  allMaterias = toSignal(this.materiaSvc.list(), { initialValue: [] });
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

  // --- materias_mapping ---
  selectedExamenId = signal<string | null>(null);
  selectedExamenNombre = signal('');

  // Reactive mappings based on selectedExamenId
  mappings = toSignal(
    toObservable(this.selectedExamenId).pipe(
      switchMap((id) => (id ? this.svc.listMateriasMapping(id) : of([]))),
    ),
    { initialValue: undefined },
  );

  // Add mapping form
  newMapMateriaId = '';
  newMapNombreGuia = '';
  newMapReactivos = 10;

  // Edit mapping
  editingMapId = signal<string | null>(null);
  editMapNombre = signal('');
  editMapReactivos = signal(0);

  // Temas mapping sub-panel
  temasMapId = signal<string | null>(null);
  temasMapMateriaId = signal('');
  newTemaMappingId = '';
  newTemaMappingNombre = '';

  // Reactive temas for the selected materia (in temas panel)
  temasForMateria = toSignal(
    toObservable(this.temasMapMateriaId).pipe(
      switchMap((id) => (id ? this.temaSvc.listByMateria(id) : of([]))),
    ),
    { initialValue: [] },
  );

  // --- Examen CRUD ---

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
      if (this.selectedExamenId() === id) this.selectedExamenId.set(null);
    }
  }

  // --- Materias Mapping ---

  selectExamen(ex: Examen) {
    if (this.selectedExamenId() === ex.id) {
      this.selectedExamenId.set(null);
    } else {
      this.selectedExamenId.set(ex.id!);
      this.selectedExamenNombre.set(`${ex.escuela} – ${ex.nombre} (${ex.area})`);
      this.temasMapId.set(null);
    }
  }

  materiaName(id: string): string {
    return this.allMaterias().find((m) => m.id === id)?.nombre_canonical ?? id;
  }

  async addMapping() {
    const exId = this.selectedExamenId();
    if (!exId || !this.newMapMateriaId || !this.newMapNombreGuia.trim()) return;
    await this.svc.addMateriaMapping(exId, {
      materia_id: this.newMapMateriaId,
      nombre_en_guia: this.newMapNombreGuia.trim(),
      num_reactivos: this.newMapReactivos,
      temas_mapping: [],
    });
    this.newMapMateriaId = '';
    this.newMapNombreGuia = '';
    this.newMapReactivos = 10;
  }

  startEditMapping(mm: MateriaMapping) {
    this.editingMapId.set(mm.id!);
    this.editMapNombre.set(mm.nombre_en_guia);
    this.editMapReactivos.set(mm.num_reactivos);
  }

  async saveMapping(mapId: string) {
    const exId = this.selectedExamenId();
    if (!exId) return;
    await this.svc.updateMateriaMapping(exId, mapId, {
      nombre_en_guia: this.editMapNombre().trim(),
      num_reactivos: this.editMapReactivos(),
    });
    this.editingMapId.set(null);
  }

  async removeMapping(mapId: string) {
    const exId = this.selectedExamenId();
    if (!exId || !confirm('Eliminar esta materia del examen?')) return;
    await this.svc.deleteMateriaMapping(exId, mapId);
    if (this.temasMapId() === mapId) this.temasMapId.set(null);
  }

  // --- Temas mapping inside a MateriaMapping ---

  toggleTemasPanel(mm: MateriaMapping) {
    if (this.temasMapId() === mm.id) {
      this.temasMapId.set(null);
    } else {
      this.temasMapId.set(mm.id!);
      this.temasMapMateriaId.set(mm.materia_id);
      this.newTemaMappingId = '';
      this.newTemaMappingNombre = '';
    }
  }

  async addTemaMapping(mm: MateriaMapping) {
    const exId = this.selectedExamenId();
    if (!exId || !this.newTemaMappingId || !this.newTemaMappingNombre.trim()) return;
    const existing = mm.temas_mapping || [];
    if (existing.some((t) => t.tema_id === this.newTemaMappingId)) return;
    const updated = [...existing, { tema_id: this.newTemaMappingId, nombre_en_guia: this.newTemaMappingNombre.trim() }];
    await this.svc.updateMateriaMapping(exId, mm.id!, { temas_mapping: updated });
    this.newTemaMappingId = '';
    this.newTemaMappingNombre = '';
  }

  async removeTemaMapping(mm: MateriaMapping, temaId: string) {
    const exId = this.selectedExamenId();
    if (!exId) return;
    const updated = (mm.temas_mapping || []).filter((t) => t.tema_id !== temaId);
    await this.svc.updateMateriaMapping(exId, mm.id!, { temas_mapping: updated });
  }
}
