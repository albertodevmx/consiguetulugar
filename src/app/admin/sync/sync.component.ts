import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SyncService, AuthUserRecord } from '../../core/services/sync.service';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Sincronizacion de Usuarios</h2>
    <p class="text-muted">Detecta discrepancias entre Firebase Auth y Firestore.</p>

    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-primary" (click)="loadUsers()" [disabled]="loading()">
        @if (loading()) {
          <span class="spinner-border spinner-border-sm me-1"></span>
        }
        {{ loading() ? 'Cargando...' : 'Escanear usuarios' }}
      </button>

      @if (unsyncedUsers().length > 0) {
        <button class="btn btn-success" (click)="syncAll()" [disabled]="syncing()">
          @if (syncing()) {
            <span class="spinner-border spinner-border-sm me-1"></span>
          }
          Sincronizar todos ({{ unsyncedUsers().length }})
        </button>
      }
    </div>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    @if (successMsg()) {
      <div class="alert alert-success">{{ successMsg() }}</div>
    }

    @if (scanned()) {
      <!-- Summary cards -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h5 class="card-title mb-0">{{ totalUsers() }}</h5>
              <small class="text-muted">Firebase Auth</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h5 class="card-title mb-0">{{ syncedCount() }}</h5>
              <small class="text-muted">Sincronizados</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center" [class.border-danger]="unsyncedUsers().length > 0">
            <div class="card-body">
              <h5 class="card-title mb-0" [class.text-danger]="unsyncedUsers().length > 0">
                {{ unsyncedUsers().length }}
              </h5>
              <small class="text-muted">Sin sincronizar</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h5 class="card-title mb-0"
                [class.text-success]="unsyncedUsers().length === 0"
                [class.text-warning]="unsyncedUsers().length > 0">
                {{ unsyncedUsers().length === 0 ? '100%' : syncPercentage() + '%' }}
              </h5>
              <small class="text-muted">Cobertura</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter tabs -->
      <ul class="nav nav-tabs mb-3">
        <li class="nav-item">
          <a class="nav-link" [class.active]="filter() === 'all'" href="javascript:void(0)" (click)="filter.set('all')">
            Todos ({{ allUsers().length }})
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" [class.active]="filter() === 'unsynced'" href="javascript:void(0)" (click)="filter.set('unsynced')">
            Sin sincronizar ({{ unsyncedUsers().length }})
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" [class.active]="filter() === 'synced'" href="javascript:void(0)" (click)="filter.set('synced')">
            Sincronizados ({{ syncedCount() }})
          </a>
        </li>
      </ul>

      <!-- Search -->
      <input class="form-control form-control-sm mb-3" style="max-width:300px"
        placeholder="Buscar por email o nombre..."
        [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" name="search" />

      @if (displayedUsers().length === 0) {
        <p class="text-muted">No se encontraron usuarios con este filtro.</p>
      } @else {
        <div class="table-responsive">
          <table class="table table-striped table-sm align-middle">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Creado en Auth</th>
                <th>Ultimo login</th>
                <th>Estado</th>
                <th style="width:200px">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (u of displayedUsers(); track u.uid) {
                <tr [class.table-warning]="!u.inFirestore">
                  <td><small>{{ u.email || 'Sin email' }}</small></td>
                  <td>{{ u.displayName || '-' }}</td>
                  <td><small>{{ formatDate(u.creationTime) }}</small></td>
                  <td><small>{{ formatDate(u.lastSignInTime) }}</small></td>
                  <td>
                    @if (u.inFirestore) {
                      <span class="badge bg-success">Sincronizado</span>
                    } @else {
                      <span class="badge bg-danger">Solo en Auth</span>
                    }
                  </td>
                  <td>
                    @if (!u.inFirestore) {
                      <button class="btn btn-sm btn-outline-success me-1"
                        (click)="syncOne(u)" [disabled]="u.uid === actionUid()">
                        @if (u.uid === actionUid() && actionType() === 'sync') {
                          <span class="spinner-border spinner-border-sm"></span>
                        } @else {
                          Sincronizar
                        }
                      </button>
                    }
                    <button class="btn btn-sm btn-outline-danger"
                      (click)="confirmDelete(u)" [disabled]="u.uid === actionUid()">
                      @if (u.uid === actionUid() && actionType() === 'delete') {
                        <span class="spinner-border spinner-border-sm"></span>
                      } @else {
                        Eliminar
                      }
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class SyncComponent {
  private readonly syncSvc = inject(SyncService);

  allUsers = signal<AuthUserRecord[]>([]);
  loading = signal(false);
  syncing = signal(false);
  scanned = signal(false);
  error = signal('');
  successMsg = signal('');
  filter = signal<'all' | 'unsynced' | 'synced'>('unsynced');
  searchTerm = signal('');
  actionUid = signal('');
  actionType = signal<'sync' | 'delete' | ''>('');

  totalUsers = computed(() => this.allUsers().length);
  unsyncedUsers = computed(() => this.allUsers().filter((u) => !u.inFirestore));
  syncedCount = computed(() => this.allUsers().filter((u) => u.inFirestore).length);
  syncPercentage = computed(() => {
    const total = this.totalUsers();
    if (total === 0) return 100;
    return Math.round((this.syncedCount() / total) * 100);
  });

  displayedUsers = computed(() => {
    let users = this.allUsers();
    const f = this.filter();
    if (f === 'unsynced') users = users.filter((u) => !u.inFirestore);
    if (f === 'synced') users = users.filter((u) => u.inFirestore);

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.displayName?.toLowerCase().includes(term),
      );
    }
    return users;
  });

  async loadUsers() {
    this.loading.set(true);
    this.error.set('');
    this.successMsg.set('');
    try {
      const res = await this.syncSvc.listAuthUsers();
      this.allUsers.set(res.users);
      this.scanned.set(true);
      if (res.unsynced > 0) {
        this.filter.set('unsynced');
      } else {
        this.filter.set('all');
        this.successMsg.set('Todos los usuarios estan sincronizados.');
      }
    } catch (e: any) {
      this.error.set(e.message || 'Error al cargar usuarios');
    } finally {
      this.loading.set(false);
    }
  }

  async syncOne(user: AuthUserRecord) {
    this.actionUid.set(user.uid);
    this.actionType.set('sync');
    this.error.set('');
    this.successMsg.set('');
    try {
      await this.syncSvc.syncUser(user.uid);
      // Update local state
      this.allUsers.update((users) =>
        users.map((u) => (u.uid === user.uid ? { ...u, inFirestore: true } : u)),
      );
      this.successMsg.set(`Usuario ${user.email || user.uid} sincronizado.`);
    } catch (e: any) {
      this.error.set(e.message || 'Error al sincronizar');
    } finally {
      this.actionUid.set('');
      this.actionType.set('');
    }
  }

  async syncAll() {
    this.syncing.set(true);
    this.error.set('');
    this.successMsg.set('');
    const unsynced = this.unsyncedUsers();
    let synced = 0;
    const errors: string[] = [];

    for (const user of unsynced) {
      try {
        await this.syncSvc.syncUser(user.uid);
        this.allUsers.update((users) =>
          users.map((u) => (u.uid === user.uid ? { ...u, inFirestore: true } : u)),
        );
        synced++;
      } catch (e: any) {
        errors.push(`${user.email || user.uid}: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      this.error.set(`Errores en ${errors.length} usuarios: ${errors.join('; ')}`);
    }
    this.successMsg.set(`${synced} usuarios sincronizados exitosamente.`);
    this.syncing.set(false);
  }

  confirmDelete(user: AuthUserRecord) {
    const label = user.email || user.uid;
    if (!confirm(`¿Estas seguro de eliminar al usuario ${label}? Esta accion no se puede deshacer.`)) {
      return;
    }
    this.deleteUser(user);
  }

  private async deleteUser(user: AuthUserRecord) {
    this.actionUid.set(user.uid);
    this.actionType.set('delete');
    this.error.set('');
    this.successMsg.set('');
    try {
      await this.syncSvc.deleteUser(user.uid, user.inFirestore);
      this.allUsers.update((users) => users.filter((u) => u.uid !== user.uid));
      this.successMsg.set(`Usuario ${user.email || user.uid} eliminado.`);
    } catch (e: any) {
      this.error.set(e.message || 'Error al eliminar');
    } finally {
      this.actionUid.set('');
      this.actionType.set('');
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
