import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { MateriaService } from '../../core/services/materia.service';
import { TemaService } from '../../core/services/tema.service';
import { PreguntaService } from '../../core/services/pregunta.service';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';
import { Materia, Tema } from '../../core/models';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Materias y Temas</h2>

    <!-- Agregar materia -->
    <form (ngSubmit)="addMateria()" class="row g-2 mb-4">
      <div class="col-auto">
        <input class="form-control" [(ngModel)]="newMateriaName" name="matName"
          placeholder="Nombre de la materia" required />
      </div>
      <div class="col-auto">
        <button type="submit" class="btn btn-primary" [disabled]="!newMateriaName.trim()">Agregar materia</button>
      </div>
    </form>

    @if (materias() === undefined) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary"><span class="visually-hidden">Cargando...</span></div>
      </div>
    } @else {
      <div class="accordion" id="materiasAccordion">
        @for (mat of materias()!; track mat.id) {
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button" [class.collapsed]="selectedMateriaId() !== mat.id"
                type="button" (click)="toggleMateria(mat.id!)">
                <span class="me-auto">{{ mat.nombre_canonical }} <small class="text-muted font-monospace ms-2">{{ mat.id }}</small></span>
                <button class="btn btn-sm btn-outline-danger me-2" (click)="removeMateria(mat.id!); $event.stopPropagation()">Eliminar</button>
              </button>
            </h2>
            @if (selectedMateriaId() === mat.id) {
              <div class="accordion-body p-3">
                <!-- Temas for this materia -->
                @if (temas() === undefined) {
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                } @else {
                  <table class="table table-sm mb-3">
                    <thead>
                      <tr><th>Orden</th><th>Tema</th><th>ID</th><th style="width:320px">Acciones</th></tr>
                    </thead>
                    <tbody>
                      @for (tema of temas()!; track tema.id) {
                        <tr>
                          <td>{{ tema.orden }}</td>
                          <td>
                            @if (editingTemaId() === tema.id) {
                              <input class="form-control form-control-sm" [ngModel]="editTemaName()"
                                (ngModelChange)="editTemaName.set($event)" [ngModelOptions]="{standalone:true}" />
                            } @else {
                              {{ tema.nombre_canonical }}
                            }
                          </td>
                          <td><small class="text-muted font-monospace">{{ tema.id }}</small></td>
                          <td>
                            @if (editingTemaId() === tema.id) {
                              <button class="btn btn-sm btn-success me-1" (click)="saveTemaEdit(mat.id!, tema.id!)">Guardar</button>
                              <button class="btn btn-sm btn-secondary" (click)="editingTemaId.set(null)">Cancelar</button>
                            } @else {
                              <button class="btn btn-sm btn-outline-primary me-1" (click)="startTemaEdit(tema)">Editar</button>
                              <button class="btn btn-sm btn-outline-danger me-1" (click)="removeTema(mat.id!, tema.id!)">Eliminar</button>
                              <button class="btn btn-sm btn-outline-warning"
                                (click)="openGenerate(mat, tema)"
                                [disabled]="generatingTemaId() !== null" title="Generar preguntas con IA">
                                AI Preguntas
                              </button>
                            }
                          </td>
                        </tr>

                        <!-- AI Generation panel -->
                        @if (generatingTemaId() === tema.id) {
                          <tr>
                            <td colspan="4">
                              <div class="card border-warning">
                                <div class="card-body py-2">
                                  <div class="d-flex align-items-center justify-content-between mb-2">
                                    <strong>Generar para: {{ tema.nombre_canonical }}</strong>
                                    <button class="btn btn-sm btn-outline-secondary" (click)="closeGenerate()" [disabled]="generating()">Cerrar</button>
                                  </div>
                                  <div class="d-flex align-items-center gap-2">
                                    <label class="form-label mb-0">Cantidad:</label>
                                    <input type="number" class="form-control form-control-sm" style="width:80px"
                                      [ngModel]="generateCount()" (ngModelChange)="generateCount.set($event)"
                                      [ngModelOptions]="{standalone:true}" min="1" max="20" [disabled]="generating()" />
                                    <button class="btn btn-sm btn-warning" (click)="executeGenerate(mat.id!, tema.id!, tema.nombre_canonical, mat.nombre_canonical)" [disabled]="generating()">
                                      @if (generating()) {
                                        <span class="spinner-border spinner-border-sm me-1"></span>Generando...
                                      } @else { Generar }
                                    </button>
                                  </div>
                                  @if (generateMsg()) {
                                    <div class="alert mt-2 mb-0 py-1"
                                      [class.alert-success]="generateOk()" [class.alert-danger]="!generateOk()">
                                      {{ generateMsg() }}
                                    </div>
                                  }
                                </div>
                              </div>
                            </td>
                          </tr>
                        }
                      } @empty {
                        <tr><td colspan="4" class="text-muted">Sin temas.</td></tr>
                      }
                    </tbody>
                  </table>

                  <!-- Add tema -->
                  <div class="row g-2">
                    <div class="col-auto">
                      <input class="form-control form-control-sm" [(ngModel)]="newTemaName"
                        name="temaName" placeholder="Nombre del tema" />
                    </div>
                    <div class="col-auto">
                      <input type="number" class="form-control form-control-sm" [(ngModel)]="newTemaOrden"
                        name="temaOrden" placeholder="Orden" style="width:80px" />
                    </div>
                    <div class="col-auto">
                      <button class="btn btn-sm btn-primary" (click)="addTema(mat.id!)"
                        [disabled]="!newTemaName.trim()">Agregar tema</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        } @empty {
          <p class="text-muted">No hay materias registradas.</p>
        }
      </div>
    }
  `,
})
export class MateriasComponent {
  private readonly materiaSvc = inject(MateriaService);
  private readonly temaSvc = inject(TemaService);
  private readonly auth = inject(Auth);

  materias = toSignal(this.materiaSvc.list());

  selectedMateriaId = signal<string | null>(null);

  temas = toSignal(
    toObservable(this.selectedMateriaId).pipe(
      switchMap((id) => (id ? this.temaSvc.listByMateria(id) : of(undefined))),
    ),
  );

  // Materia add
  newMateriaName = '';

  // Tema add
  newTemaName = '';
  newTemaOrden = 1;

  // Tema edit
  editingTemaId = signal<string | null>(null);
  editTemaName = signal('');

  // AI Generation
  generatingTemaId = signal<string | null>(null);
  generateCount = signal(10);
  generating = signal(false);
  generateMsg = signal('');
  generateOk = signal(true);

  toggleMateria(id: string) {
    this.selectedMateriaId.set(this.selectedMateriaId() === id ? null : id);
    this.editingTemaId.set(null);
    this.closeGenerate();
  }

  async addMateria() {
    const name = this.newMateriaName.trim();
    if (!name) return;
    await this.materiaSvc.add({ nombre_canonical: name });
    this.newMateriaName = '';
  }

  async removeMateria(id: string) {
    if (confirm('Eliminar esta materia y todos sus temas?')) {
      await this.materiaSvc.delete(id);
      if (this.selectedMateriaId() === id) this.selectedMateriaId.set(null);
    }
  }

  async addTema(materiaId: string) {
    const name = this.newTemaName.trim();
    if (!name) return;
    await this.temaSvc.add(materiaId, { nombre_canonical: name, orden: this.newTemaOrden });
    this.newTemaName = '';
    this.newTemaOrden = (this.temas()?.length ?? 0) + 1;
  }

  startTemaEdit(tema: Tema) {
    this.editingTemaId.set(tema.id!);
    this.editTemaName.set(tema.nombre_canonical);
  }

  async saveTemaEdit(materiaId: string, temaId: string) {
    await this.temaSvc.update(materiaId, temaId, { nombre_canonical: this.editTemaName().trim() });
    this.editingTemaId.set(null);
  }

  async removeTema(materiaId: string, temaId: string) {
    if (confirm('Eliminar este tema?')) {
      await this.temaSvc.delete(materiaId, temaId);
    }
  }

  // --- AI Generation ---
  openGenerate(mat: Materia, tema: Tema) {
    this.generatingTemaId.set(tema.id!);
    this.generateCount.set(10);
    this.generateMsg.set('');
  }

  closeGenerate() {
    this.generatingTemaId.set(null);
    this.generateMsg.set('');
  }

  async executeGenerate(materiaId: string, temaId: string, temaName: string, materiaName: string) {
    const count = this.generateCount();
    if (count < 1 || count > 20) return;
    this.generating.set(true);
    this.generateMsg.set('');
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No has iniciado sesion.');
      const token = await user.getIdToken();
      const response = await fetch(`${environment.functionsUrl}/generateQuestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topicId: temaId, topicName: temaName, count, context: materiaName, materiaId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error de conexion' }));
        throw new Error(err.error || 'Error al generar');
      }
      const { generated } = await response.json();
      this.generateMsg.set(`${generated} preguntas generadas.`);
      this.generateOk.set(true);
    } catch (e) {
      this.generateMsg.set((e as Error).message);
      this.generateOk.set(false);
    } finally {
      this.generating.set(false);
    }
  }
}
