import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MensajeService } from '../../core/services/mensaje.service';
import { PreguntaService } from '../../core/services/pregunta.service';
import { Mensaje } from '../../core/models';

@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <h2>Buzón de mensajes</h2>

    <!-- Tabs -->
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" [class.active]="tab() === 'todos'" (click)="tab.set('todos')">
          Todos
          @if (totalNuevos() > 0) {
            <span class="badge bg-danger ms-1">{{ totalNuevos() }}</span>
          }
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" [class.active]="tab() === 'feedback'" (click)="tab.set('feedback')">
          <i class="bi bi-chat-heart me-1"></i>Opiniones
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" [class.active]="tab() === 'reportes'" (click)="tab.set('reportes')">
          <i class="bi bi-flag me-1"></i>Reportes
          @if (reportesNuevos() > 0) {
            <span class="badge bg-danger ms-1">{{ reportesNuevos() }}</span>
          }
        </button>
      </li>
    </ul>

    @if (loading()) {
      <div class="d-flex justify-content-center py-5">
        <div class="spinner-border text-primary"><span class="visually-hidden">Cargando...</span></div>
      </div>
    } @else if (filteredMessages().length === 0) {
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
        <p>No hay mensajes.</p>
      </div>
    } @else {
      <p class="text-muted small">{{ filteredMessages().length }} mensaje(s)</p>

      <div class="list-group">
        @for (m of filteredMessages(); track m.id) {
          <div class="list-group-item" [class.list-group-item-warning]="m.estado === 'nuevo'" [class.list-group-item-light]="m.estado === 'archivado'">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <!-- Header -->
                <div class="d-flex align-items-center gap-2 mb-1">
                  @switch (m.tipo) {
                    @case ('opinion') {
                      <span class="badge bg-primary"><i class="bi bi-chat-heart me-1"></i>Opinión</span>
                    }
                    @case ('feedback') {
                      <span class="badge bg-info text-dark"><i class="bi bi-lightbulb me-1"></i>Sugerencia</span>
                    }
                    @case ('reporte') {
                      <span class="badge bg-danger"><i class="bi bi-flag me-1"></i>Reporte</span>
                    }
                  }
                  <small class="text-muted">
                    @if (m.origen === 'home') { desde Inicio }
                    @else if (m.origen === 'practicar') { desde Practicar }
                    @else if (m.origen === 'pregunta') { desde Pregunta }
                  </small>
                  @if (m.estado === 'nuevo') {
                    <span class="badge bg-warning text-dark">Nuevo</span>
                  }
                </div>

                <!-- Message text -->
                <p class="mb-1">{{ m.texto }}</p>

                <!-- Reported question preview -->
                @if (m.pregunta_id) {
                  <div class="card bg-light mb-2">
                    <div class="card-body py-2 px-3">
                      <small class="text-muted d-block mb-1"><strong>Pregunta reportada:</strong></small>
                      <small>{{ m.pregunta_texto }}</small>
                      <div class="mt-1">
                        <a routerLink="/dashboard/preguntas" class="btn btn-outline-primary btn-sm">
                          <i class="bi bi-pencil me-1"></i>Ir a preguntas
                        </a>
                      </div>
                    </div>
                  </div>
                }

                <!-- User info -->
                <small class="text-muted">
                  @if (m.usuario_nombre) {
                    <i class="bi bi-person me-1"></i>{{ m.usuario_nombre }}
                    @if (m.usuario_email) { ({{ m.usuario_email }}) }
                  } @else {
                    <i class="bi bi-incognito me-1"></i>Anónimo
                  }
                  <span class="mx-1">·</span>
                  <i class="bi bi-clock me-1"></i>{{ m.fecha_creacion?.toDate() | date:'dd/MM/yyyy HH:mm' }}
                </small>
              </div>

              <!-- Actions -->
              <div class="d-flex flex-column gap-1 ms-2">
                @if (m.estado === 'nuevo') {
                  <button class="btn btn-outline-success btn-sm" (click)="marcarLeido(m.id!)" title="Marcar como leído">
                    <i class="bi bi-check2"></i>
                  </button>
                }
                @if (m.estado !== 'archivado') {
                  <button class="btn btn-outline-secondary btn-sm" (click)="archivar(m.id!)" title="Archivar">
                    <i class="bi bi-archive"></i>
                  </button>
                }
                <button class="btn btn-outline-danger btn-sm" (click)="eliminar(m.id!)" title="Eliminar">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }

    @if (msg()) {
      <div class="alert mt-3" [class.alert-success]="msgOk()" [class.alert-danger]="!msgOk()">
        {{ msg() }}
      </div>
    }
  `,
})
export class MensajesComponent {
  private readonly mensajeSvc = inject(MensajeService);

  tab = signal<'todos' | 'feedback' | 'reportes'>('todos');

  private allMessages = toSignal(this.mensajeSvc.listAll(), { initialValue: [] });
  private nuevos = toSignal(this.mensajeSvc.listNuevos(), { initialValue: [] });

  loading = computed(() => this.allMessages() === undefined);

  totalNuevos = computed(() => this.nuevos().length);

  reportesNuevos = computed(() =>
    this.nuevos().filter((m) => m.tipo === 'reporte').length,
  );

  filteredMessages = computed(() => {
    const all = this.allMessages() ?? [];
    const t = this.tab();
    if (t === 'feedback') return all.filter((m) => m.tipo === 'opinion' || m.tipo === 'feedback');
    if (t === 'reportes') return all.filter((m) => m.tipo === 'reporte');
    return all;
  });

  msg = signal('');
  msgOk = signal(true);

  async marcarLeido(id: string) {
    try {
      await this.mensajeSvc.marcarLeido(id);
      this.msg.set('Marcado como leído.');
      this.msgOk.set(true);
    } catch (e) {
      this.msg.set('Error: ' + (e as Error).message);
      this.msgOk.set(false);
    }
    this.clearMsg();
  }

  async archivar(id: string) {
    try {
      await this.mensajeSvc.archivar(id);
      this.msg.set('Mensaje archivado.');
      this.msgOk.set(true);
    } catch (e) {
      this.msg.set('Error: ' + (e as Error).message);
      this.msgOk.set(false);
    }
    this.clearMsg();
  }

  async eliminar(id: string) {
    if (!confirm('¿Eliminar este mensaje?')) return;
    try {
      await this.mensajeSvc.eliminar(id);
      this.msg.set('Mensaje eliminado.');
      this.msgOk.set(true);
    } catch (e) {
      this.msg.set('Error: ' + (e as Error).message);
      this.msgOk.set(false);
    }
    this.clearMsg();
  }

  private clearMsg() {
    setTimeout(() => this.msg.set(''), 3000);
  }
}
