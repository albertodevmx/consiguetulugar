import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { UsuarioService } from '../../core/services/usuario.service';
import { ExamenService } from '../../core/services/examen.service';
import { Usuario, RolUsuario, Examen } from '../../core/models';
import { toSignal } from '@angular/core/rxjs-interop';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Usuarios</h2>

    <!-- Search / filter -->
    <div class="d-flex flex-wrap gap-2 mb-3">
      <input class="form-control form-control-sm" style="max-width:250px"
        placeholder="Buscar por nombre o email..."
        [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" name="search" />
      <select class="form-select form-select-sm" style="max-width:160px"
        [ngModel]="filterPlan()" (ngModelChange)="filterPlan.set($event)" name="filterPlan">
        <option value="">Todos los planes</option>
        <option value="gratuito">Gratuito</option>
        <option value="premium">Premium</option>
      </select>
      <select class="form-select form-select-sm" style="max-width:140px"
        [ngModel]="filterRol()" (ngModelChange)="filterRol.set($event)" name="filterRol">
        <option value="">Todos los roles</option>
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="usuario">Usuario</option>
      </select>
      <span class="badge bg-secondary align-self-center">{{ filteredUsers().length }} usuarios</span>
    </div>

    @if (loadingPage()) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary"><span class="visually-hidden">Cargando...</span></div>
      </div>
    } @else if (filteredUsers().length === 0) {
      <p class="text-muted">No se encontraron usuarios.</p>
    } @else {
      <div class="table-responsive">
        <table class="table table-striped table-sm align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Plan</th>
              <th>Examenes pagados</th>
              <th>Stripe</th>
              <th>Preguntas semana</th>
              <th>Registro</th>
              <th style="width:120px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (u of paginatedUsers(); track u.id) {
              <tr [class.table-active]="editingId() === u.id">
                <td>
                  @if (editingId() === u.id) {
                    <input class="form-control form-control-sm" [ngModel]="editNombre()"
                      (ngModelChange)="editNombre.set($event)" [ngModelOptions]="{standalone:true}" />
                  } @else {
                    {{ u.nombre }}
                  }
                </td>
                <td><small>{{ u.email }}</small></td>
                <td>
                  @if (editingId() === u.id) {
                    <select class="form-select form-select-sm" style="width:100px"
                      [ngModel]="editRol()" (ngModelChange)="editRol.set($event)" [ngModelOptions]="{standalone:true}">
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="usuario">usuario</option>
                    </select>
                  } @else {
                    <span class="badge" [class]="rolBadge(u.rol)">{{ u.rol }}</span>
                  }
                </td>
                <td>
                  @if (editingId() === u.id) {
                    <select class="form-select form-select-sm" style="width:110px"
                      [ngModel]="editPlan()" (ngModelChange)="editPlan.set($event)" [ngModelOptions]="{standalone:true}">
                      <option value="gratuito">gratuito</option>
                      <option value="premium">premium</option>
                    </select>
                  } @else {
                    <span class="badge" [class]="u.plan === 'premium' ? 'bg-success' : 'bg-secondary'">{{ u.plan }}</span>
                  }
                </td>
                <td>
                  @if (editingId() === u.id) {
                    <div style="max-width:220px">
                      @for (exId of editExamenes(); track exId; let i = $index) {
                        <div class="d-flex align-items-center gap-1 mb-1">
                          <small class="text-truncate flex-grow-1" title="{{ examenName(exId) }}">{{ examenName(exId) || exId }}</small>
                          <button class="btn btn-outline-danger btn-sm py-0 px-1" (click)="removeEditExamen(i)"
                            title="Quitar">&times;</button>
                        </div>
                      }
                      <div class="d-flex gap-1">
                        <select class="form-select form-select-sm" style="max-width:170px"
                          [ngModel]="addExamenId()" (ngModelChange)="addExamenId.set($event)" [ngModelOptions]="{standalone:true}">
                          <option value="">+ Agregar examen</option>
                          @for (ex of allExamenes(); track ex.id) {
                            <option [value]="ex.id">{{ ex.escuela }} - {{ ex.nombre }}</option>
                          }
                        </select>
                        <button class="btn btn-sm btn-outline-primary py-0" (click)="addEditExamen()"
                          [disabled]="!addExamenId()">+</button>
                      </div>
                    </div>
                  } @else {
                    @if (u.examenes_pagados?.length) {
                      @for (exId of u.examenes_pagados; track exId) {
                        <span class="badge bg-info me-1" title="{{ exId }}">{{ examenName(exId) || exId }}</span>
                      }
                    } @else {
                      <span class="text-muted small">-</span>
                    }
                  }
                </td>
                <td>
                  @if (u.stripe_customer_id) {
                    <small class="font-monospace d-block text-truncate" style="max-width:120px"
                      title="{{ u.stripe_customer_id }}">{{ u.stripe_customer_id }}</small>
                  }
                  @if (u.stripe_subscription_id) {
                    <small class="font-monospace d-block text-truncate text-muted" style="max-width:120px"
                      title="{{ u.stripe_subscription_id }}">{{ u.stripe_subscription_id }}</small>
                  }
                  @if (!u.stripe_customer_id && !u.stripe_subscription_id) {
                    <span class="text-muted small">-</span>
                  }
                </td>
                <td class="text-center">{{ u.preguntas_semana ?? 0 }}</td>
                <td><small>{{ formatDate(u.fecha_registro) }}</small></td>
                <td>
                  @if (editingId() === u.id) {
                    <button class="btn btn-sm btn-success me-1" (click)="saveEdit(u.id!)"
                      [disabled]="saving()">Guardar</button>
                    <button class="btn btn-sm btn-secondary" (click)="cancelEdit()">Cancelar</button>
                  } @else {
                    <button class="btn btn-sm btn-outline-primary" (click)="startEdit(u)">Editar</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="d-flex justify-content-between align-items-center mt-3">
        <small class="text-muted">
          Mostrando {{ pageStart() + 1 }}-{{ pageEnd() }} de {{ filteredUsers().length }}
        </small>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" (click)="prevPage()" [disabled]="currentPage() === 0">
            <i class="bi bi-chevron-left"></i> Anterior
          </button>
          <span class="align-self-center small">Pagina {{ currentPage() + 1 }} de {{ totalPages() }}</span>
          <button class="btn btn-sm btn-outline-primary" (click)="nextPage()" [disabled]="currentPage() >= totalPages() - 1">
            Siguiente <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    }
  `,
})
export class UsuariosComponent {
  private readonly usuarioSvc = inject(UsuarioService);
  private readonly examenSvc = inject(ExamenService);

  allUsers = signal<Usuario[]>([]);
  loadingPage = signal(true);
  saving = signal(false);

  // Filters
  searchTerm = signal('');
  filterPlan = signal('');
  filterRol = signal('');
  currentPage = signal(0);

  // Edit state
  editingId = signal<string | null>(null);
  editNombre = signal('');
  editRol = signal<RolUsuario>('usuario');
  editPlan = signal<'gratuito' | 'premium'>('gratuito');
  editExamenes = signal<string[]>([]);
  addExamenId = signal('');

  // Exams lookup
  private examenes = toSignal(this.examenSvc.list(), { initialValue: [] as Examen[] });

  allExamenes = computed(() => this.examenes());

  filteredUsers = computed(() => {
    let users = this.allUsers();
    const term = this.searchTerm().toLowerCase().trim();
    const plan = this.filterPlan();
    const rol = this.filterRol();

    if (term) {
      users = users.filter(
        (u) =>
          u.nombre?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term),
      );
    }
    if (plan) users = users.filter((u) => u.plan === plan);
    if (rol) users = users.filter((u) => u.rol === rol);

    return users;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / PAGE_SIZE)));

  pageStart = computed(() => this.currentPage() * PAGE_SIZE);
  pageEnd = computed(() => Math.min(this.pageStart() + PAGE_SIZE, this.filteredUsers().length));

  paginatedUsers = computed(() => {
    return this.filteredUsers().slice(this.pageStart(), this.pageEnd());
  });

  constructor() {
    this.loadAllUsers();
  }

  private async loadAllUsers() {
    this.loadingPage.set(true);
    this.usuarioSvc.listAll().subscribe((users) => {
      this.allUsers.set(users);
      this.loadingPage.set(false);
    });
  }

  // Pagination
  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update((p) => p - 1);
    }
  }

  // Edit
  startEdit(u: Usuario) {
    this.editingId.set(u.id!);
    this.editNombre.set(u.nombre);
    this.editRol.set(u.rol);
    this.editPlan.set(u.plan);
    this.editExamenes.set([...(u.examenes_pagados ?? [])]);
    this.addExamenId.set('');
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  async saveEdit(uid: string) {
    this.saving.set(true);
    try {
      await this.usuarioSvc.update(uid, {
        nombre: this.editNombre().trim(),
        rol: this.editRol(),
        plan: this.editPlan(),
        examenes_pagados: this.editExamenes(),
      });
      this.editingId.set(null);
    } finally {
      this.saving.set(false);
    }
  }

  // Exam editing helpers
  removeEditExamen(index: number) {
    const exs = [...this.editExamenes()];
    exs.splice(index, 1);
    this.editExamenes.set(exs);
  }

  addEditExamen() {
    const id = this.addExamenId();
    if (!id) return;
    const exs = [...this.editExamenes()];
    if (!exs.includes(id)) exs.push(id);
    this.editExamenes.set(exs);
    this.addExamenId.set('');
  }

  // Helpers
  examenName(exId: string): string {
    const ex = this.examenes().find((e) => e.id === exId);
    return ex ? `${ex.escuela} - ${ex.nombre}` : '';
  }

  rolBadge(rol: RolUsuario): string {
    switch (rol) {
      case 'admin': return 'bg-danger';
      case 'editor': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  formatDate(ts: any): string {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
