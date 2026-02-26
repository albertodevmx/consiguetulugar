import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';
import { TemaService } from '../../core/services/tema.service';
import { MateriaService } from '../../core/services/materia.service';
import { Examen, TemaConfig, Tema } from '../../core/models';

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
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newEscuelaOrden"
              name="newEscOrd" placeholder="Ord. Esc." style="width:80px" title="Orden escuela" />
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
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newOrden"
              name="newOrd" placeholder="Ord. Ex." style="width:80px" title="Orden examen" />
          </div>
          <div class="col-auto">
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newAnio"
              name="newAnio" placeholder="Ano" style="width:90px" />
          </div>
          <div class="col-auto">
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newTotal"
              name="newTotal" placeholder="Reactivos" style="width:100px" />
          </div>
          <div class="col-auto">
            <input type="number" class="form-control form-control-sm" [(ngModel)]="newTiempo"
              name="newTiempo" placeholder="Min." style="width:90px" />
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
            <th>Ord. Esc.</th>
            <th>Nombre</th>
            <th>Area</th>
            <th>Ord.</th>
            <th>Reactivos</th>
            <th>Tiempo</th>
            <th style="width:280px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (ex of filtered(); track ex.id) {
            <tr [class.table-active]="selectedExamenId() === ex.id">
              <td>{{ ex.escuela }}</td>
              <td>
                @if (editingId() === ex.id) {
                  <input type="number" class="form-control form-control-sm" [ngModel]="editEscuelaOrden()"
                    (ngModelChange)="editEscuelaOrden.set($event)" [ngModelOptions]="{standalone:true}" style="width:60px" />
                } @else {
                  {{ ex.escuela_orden ?? '-' }}
                }
              </td>
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
              <td>
                @if (editingId() === ex.id) {
                  <input type="number" class="form-control form-control-sm" [ngModel]="editOrden()"
                    (ngModelChange)="editOrden.set($event)" [ngModelOptions]="{standalone:true}" style="width:60px" />
                } @else {
                  {{ ex.orden ?? '-' }}
                }
              </td>
              <td>{{ ex.total_reactivos }}</td>
              <td>{{ ex.tiempo_limite_minutos }} min</td>
              <td>
                @if (editingId() === ex.id) {
                  <button class="btn btn-sm btn-success me-1" (click)="saveEdit(ex.id!)">Guardar</button>
                  <button class="btn btn-sm btn-secondary" (click)="editingId.set(null)">Cancelar</button>
                } @else {
                  <button class="btn btn-sm btn-outline-info me-1"
                    (click)="selectExamen(ex)"
                    [class.btn-info]="selectedExamenId() === ex.id"
                    [class.text-white]="selectedExamenId() === ex.id">
                    Temas
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

    <!-- Panel de temas_config -->
    @if (selectedExamenId()) {
      <div class="card mt-4 border-info">
        <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
          <span><i class="bi bi-link-45deg me-1"></i> Temas de: {{ selectedExamenNombre() }}</span>
          <button class="btn btn-sm btn-light" (click)="selectedExamenId.set(null)">Cerrar</button>
        </div>
        <div class="card-body">

          <!-- Agregar temas en lote -->
          <div class="card border-secondary mb-3">
            <div class="card-body py-2">
              <h6 class="mb-2">Agregar temas</h6>
              <div class="row g-2 mb-2 align-items-end">
                <!-- Filtro materia -->
                <div class="col-auto">
                  <label class="form-label mb-0 small">Filtrar por materia</label>
                  <select class="form-select form-select-sm" [ngModel]="cfgFilterMateria()"
                    (ngModelChange)="cfgFilterMateria.set($event)" name="cfgFilterMat">
                    <option value="">-- Todas --</option>
                    @for (m of allMaterias(); track m.id) {
                      <option [value]="m.id">{{ m.nombre_canonical }}</option>
                    }
                  </select>
                </div>
                <!-- Seccion predictiva -->
                <div class="col-auto">
                  <label class="form-label mb-0 small">Seccion</label>
                  <input class="form-control form-control-sm" [(ngModel)]="batchSeccion"
                    name="batchSec" placeholder="ej: Matematicas"
                    list="seccionSuggestions" autocomplete="off" />
                  <datalist id="seccionSuggestions">
                    @for (s of existingSecciones(); track s) {
                      <option [value]="s"></option>
                    }
                  </datalist>
                </div>
                <!-- Reactivos por defecto -->
                <div class="col-auto">
                  <label class="form-label mb-0 small">Reactivos c/u</label>
                  <input type="number" class="form-control form-control-sm" [(ngModel)]="batchReactivos"
                    name="batchReact" style="width:80px" min="1" />
                </div>
              </div>

              <!-- Checkboxes de temas -->
              @if (cfgFilterMateria()) {
                <div class="border rounded p-2 mb-2" style="max-height:220px;overflow-y:auto">
                  @for (t of filteredTemasForCfg(); track t.id) {
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox"
                        [id]="'tema-chk-' + t.id"
                        [checked]="selectedTemaIds().includes(t.id!)"
                        [disabled]="alreadyAddedIds().has(t.id!)"
                        (change)="toggleTemaSelection(t)" />
                      <label class="form-check-label" [for]="'tema-chk-' + t.id"
                        [class.text-muted]="alreadyAddedIds().has(t.id!)">
                        {{ t.nombre_canonical }}
                        @if (alreadyAddedIds().has(t.id!)) {
                          <span class="badge bg-secondary ms-1">ya agregado</span>
                        }
                        @if (selectedTemaIds().includes(t.id!) && !alreadyAddedIds().has(t.id!)) {
                          <span class="badge bg-info ms-1">#{{ selectedTemaIds().indexOf(t.id!) + 1 }}</span>
                        }
                      </label>
                    </div>
                  } @empty {
                    <p class="text-muted mb-0 small">No hay temas para esta materia.</p>
                  }
                </div>
              } @else {
                <p class="text-muted small mb-2">Selecciona una materia para ver los temas disponibles.</p>
              }

              <!-- Resumen y boton agregar -->
              @if (selectedTemaIds().length > 0) {
                <div class="alert alert-info py-1 mb-2 small">
                  Se agregaran <strong>{{ selectedTemaIds().length }}</strong> tema(s)
                  @if (batchSeccion.trim()) {
                    a la seccion <strong>"{{ batchSeccion.trim() }}"</strong>
                  }
                  con <strong>{{ batchReactivos }}</strong> reactivos c/u.
                  Orden inicial: <strong>{{ nextOrden() }}</strong>.
                </div>
                <button class="btn btn-sm btn-primary" (click)="addBatchTemaConfig()"
                  [disabled]="addingBatch()">
                  @if (addingBatch()) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  Agregar {{ selectedTemaIds().length }} tema(s)
                </button>
              }
            </div>
          </div>

          <!-- Tabla de temas ya configurados -->
          @if (temasConfig() === undefined) {
            <div class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-info"></div>
            </div>
          } @else if (temasConfig()!.length === 0) {
            <p class="text-muted mb-0">No hay temas asignados. Agrega uno arriba.</p>
          } @else {
            <table class="table table-sm table-bordered mb-0">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Nombre mostrado</th>
                  <th>Seccion</th>
                  <th>Tema (ID)</th>
                  <th>Reactivos</th>
                  <th>Dificultades</th>
                  <th style="width:160px">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (tc of temasConfig(); track tc.id) {
                  <tr>
                    <td>{{ tc.orden }}</td>
                    <td>
                      @if (editingCfgId() === tc.id) {
                        <input class="form-control form-control-sm" [ngModel]="editCfgNombre()"
                          (ngModelChange)="editCfgNombre.set($event)" [ngModelOptions]="{standalone:true}" />
                      } @else {
                        {{ tc.nombre_mostrar }}
                      }
                    </td>
                    <td>
                      @if (editingCfgId() === tc.id) {
                        <input class="form-control form-control-sm" [ngModel]="editCfgSeccion()"
                          (ngModelChange)="editCfgSeccion.set($event)" [ngModelOptions]="{standalone:true}" />
                      } @else {
                        {{ tc.seccion }}
                      }
                    </td>
                    <td>
                      <small class="font-monospace">{{ tc.tema_id }}</small>
                      <br><small class="text-success">{{ temaName(tc.tema_id) }}</small>
                    </td>
                    <td>
                      @if (editingCfgId() === tc.id) {
                        <input type="number" class="form-control form-control-sm" [ngModel]="editCfgReactivos()"
                          (ngModelChange)="editCfgReactivos.set($event)" [ngModelOptions]="{standalone:true}"
                          style="width:70px" />
                      } @else {
                        {{ tc.num_reactivos }}
                      }
                    </td>
                    <td>
                      @for (d of tc.dificultades; track d) {
                        @switch (d) {
                          @case (1) { <span class="badge bg-success me-1">F</span> }
                          @case (2) { <span class="badge bg-warning text-dark me-1">M</span> }
                          @case (3) { <span class="badge bg-danger me-1">D</span> }
                        }
                      }
                    </td>
                    <td>
                      @if (editingCfgId() === tc.id) {
                        <button class="btn btn-sm btn-success me-1" (click)="saveTemaConfig(tc.id!)">Guardar</button>
                        <button class="btn btn-sm btn-secondary" (click)="editingCfgId.set(null)">Cancelar</button>
                      } @else {
                        <button class="btn btn-sm btn-outline-primary me-1" (click)="startEditConfig(tc)">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" (click)="removeTemaConfig(tc.id!)">Eliminar</button>
                      }
                    </td>
                  </tr>
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
  private readonly temaSvc = inject(TemaService);
  private readonly materiaSvc = inject(MateriaService);

  examenes = toSignal(this.svc.list());
  allTemas = toSignal(this.temaSvc.list(), { initialValue: [] });
  allMaterias = toSignal(this.materiaSvc.list(), { initialValue: [] });
  filterEscuela = signal('');

  escuelas = computed(() => {
    const list = this.examenes() ?? [];
    return [...new Set(list.map((e) => e.escuela))].sort();
  });

  filtered = computed(() => {
    const all = this.examenes() ?? [];
    const esc = this.filterEscuela();
    const list = esc ? all.filter((e) => e.escuela === esc) : all;
    return list.sort((a, b) => (a.escuela_orden ?? 99) - (b.escuela_orden ?? 99) || (a.orden ?? 99) - (b.orden ?? 99));
  });

  // Add form
  newEscuela = '';
  newEscuelaOrden = 1;
  newNombre = '';
  newArea = '';
  newOrden = 1;
  newAnio = new Date().getFullYear();
  newTotal = 120;
  newTiempo = 180;

  // Edit
  editingId = signal<string | null>(null);
  editNombre = signal('');
  editArea = signal('');
  editOrden = signal(1);
  editEscuelaOrden = signal(1);

  // --- temas_config ---
  selectedExamenId = signal<string | null>(null);
  selectedExamenNombre = signal('');

  temasConfig = toSignal(
    toObservable(this.selectedExamenId).pipe(
      switchMap((id) => (id ? this.svc.listTemasConfig(id) : of([]))),
    ),
    { initialValue: undefined },
  );

  // Batch add config
  cfgFilterMateria = signal('');
  batchSeccion = '';
  batchReactivos = 10;
  selectedTemaIds = signal<string[]>([]);
  selectedTemasData = signal<Tema[]>([]);
  addingBatch = signal(false);

  // IDs of temas already in this exam's config
  alreadyAddedIds = computed(() => {
    const configs = this.temasConfig() ?? [];
    return new Set(configs.map((tc) => tc.tema_id));
  });

  // Temas filtered by selected materia
  filteredTemasForCfg = computed(() => {
    const matId = this.cfgFilterMateria();
    if (!matId) return [];
    return this.allTemas().filter((t) => t.materia_id === matId);
  });

  // Existing secciones in current exam for autocomplete
  existingSecciones = computed(() => {
    const configs = this.temasConfig() ?? [];
    return [...new Set(configs.map((tc) => tc.seccion).filter((s) => s.length > 0))];
  });

  // Next orden value based on existing configs
  nextOrden = computed(() => {
    const configs = this.temasConfig() ?? [];
    if (configs.length === 0) return 1;
    return Math.max(...configs.map((tc) => tc.orden)) + 1;
  });

  // Edit config
  editingCfgId = signal<string | null>(null);
  editCfgNombre = signal('');
  editCfgSeccion = signal('');
  editCfgReactivos = signal(0);

  // --- Examen CRUD ---

  async addExamen() {
    if (!this.newEscuela.trim() || !this.newNombre.trim()) return;
    await this.svc.add({
      escuela: this.newEscuela.trim(),
      escuela_orden: this.newEscuelaOrden,
      nombre: this.newNombre.trim(),
      area: this.newArea.trim(),
      orden: this.newOrden,
      año: this.newAnio,
      total_reactivos: this.newTotal,
      tiempo_limite_minutos: this.newTiempo,
    });
    this.newNombre = '';
    this.newArea = '';
  }

  startEdit(ex: Examen) {
    this.editingId.set(ex.id!);
    this.editNombre.set(ex.nombre);
    this.editArea.set(ex.area);
    this.editOrden.set(ex.orden ?? 1);
    this.editEscuelaOrden.set(ex.escuela_orden ?? 1);
  }

  async saveEdit(id: string) {
    await this.svc.update(id, {
      nombre: this.editNombre().trim(),
      area: this.editArea().trim(),
      orden: this.editOrden(),
      escuela_orden: this.editEscuelaOrden(),
    });
    this.editingId.set(null);
  }

  async remove(id: string) {
    if (confirm('Eliminar este examen?')) {
      await this.svc.delete(id);
      if (this.selectedExamenId() === id) this.selectedExamenId.set(null);
    }
  }

  // --- Temas Config ---

  selectExamen(ex: Examen) {
    if (this.selectedExamenId() === ex.id) {
      this.selectedExamenId.set(null);
    } else {
      this.selectedExamenId.set(ex.id!);
      this.selectedExamenNombre.set(`${ex.escuela} – ${ex.nombre} (${ex.area})`);
      this.resetBatchForm();
    }
  }

  materiaName(id: string): string {
    return this.allMaterias().find((m) => m.id === id)?.nombre_canonical ?? id;
  }

  temaName(id: string): string {
    return this.allTemas().find((t) => t.id === id)?.nombre_canonical ?? id;
  }

  // Toggle tema checkbox selection - order = click sequence
  toggleTemaSelection(tema: Tema) {
    const ids = [...this.selectedTemaIds()];
    const data = [...this.selectedTemasData()];
    const idx = ids.indexOf(tema.id!);
    if (idx >= 0) {
      ids.splice(idx, 1);
      data.splice(idx, 1);
    } else {
      ids.push(tema.id!);
      data.push(tema);
    }
    this.selectedTemaIds.set(ids);
    this.selectedTemasData.set(data);
  }

  // Add all selected temas as temas_config in one batch
  async addBatchTemaConfig() {
    const exId = this.selectedExamenId();
    if (!exId) return;
    const ids = this.selectedTemaIds();
    const data = this.selectedTemasData();
    if (ids.length === 0) return;

    this.addingBatch.set(true);
    try {
      const baseOrden = this.nextOrden();
      const seccion = this.batchSeccion.trim();
      const reactivos = this.batchReactivos;

      for (let i = 0; i < ids.length; i++) {
        await this.svc.addTemaConfig(exId, {
          tema_id: ids[i],
          nombre_mostrar: data[i].nombre_canonical,
          seccion,
          orden: baseOrden + i,
          num_reactivos: reactivos,
          dificultades: [1, 2, 3],
        });
      }
      this.resetBatchForm();
    } finally {
      this.addingBatch.set(false);
    }
  }

  private resetBatchForm() {
    this.selectedTemaIds.set([]);
    this.selectedTemasData.set([]);
    this.cfgFilterMateria.set('');
    this.batchSeccion = '';
    this.batchReactivos = 10;
  }

  startEditConfig(tc: TemaConfig) {
    this.editingCfgId.set(tc.id!);
    this.editCfgNombre.set(tc.nombre_mostrar);
    this.editCfgSeccion.set(tc.seccion);
    this.editCfgReactivos.set(tc.num_reactivos);
  }

  async saveTemaConfig(configId: string) {
    const exId = this.selectedExamenId();
    if (!exId) return;
    await this.svc.updateTemaConfig(exId, configId, {
      nombre_mostrar: this.editCfgNombre().trim(),
      seccion: this.editCfgSeccion().trim(),
      num_reactivos: this.editCfgReactivos(),
    });
    this.editingCfgId.set(null);
  }

  async removeTemaConfig(configId: string) {
    const exId = this.selectedExamenId();
    if (!exId || !confirm('Eliminar este tema del examen?')) return;
    await this.svc.deleteTemaConfig(exId, configId);
  }
}
