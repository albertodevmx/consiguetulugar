import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MensajeService } from '../../core/services/mensaje.service';
import { MAX_MESSAGE_LENGTH } from '../../core/utils/sanitize-message';
import { TipoMensaje } from '../../core/models';

@Component({
  selector: 'app-buzon',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-sm-10 col-md-7 col-lg-5">

          <div class="text-center mb-4">
            <i class="bi bi-mailbox2 text-primary" style="font-size: 3rem;"></i>
            <h1 class="h3 mt-2">Buzón de quejas y sugerencias</h1>
            <p class="text-muted">
              Tu opinión nos ayuda a mejorar. Cuéntanos qué podemos hacer mejor o
              reporta cualquier problema que hayas encontrado.
            </p>
          </div>

          @if (enviado()) {
            <div class="card border-success text-center py-4">
              <div class="card-body">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 2.5rem;"></i>
                <h4 class="mt-2">¡Mensaje enviado!</h4>
                <p class="text-muted mb-3">Gracias por escribirnos. Revisaremos tu mensaje pronto.</p>
                <div class="d-flex gap-2 justify-content-center">
                  <button class="btn btn-outline-primary btn-sm" (click)="resetForm()">
                    <i class="bi bi-plus me-1"></i>Enviar otro mensaje
                  </button>
                  <a routerLink="/" class="btn btn-primary btn-sm">
                    <i class="bi bi-house me-1"></i>Volver al inicio
                  </a>
                </div>
              </div>
            </div>
          } @else {
            <div class="card shadow-sm">
              <div class="card-body p-4">

                <!-- Tipo de mensaje -->
                <div class="mb-3">
                  <label class="form-label fw-semibold">¿Qué tipo de mensaje es?</label>
                  <div class="d-flex gap-2 flex-wrap">
                    <button
                      class="btn btn-sm"
                      [class]="selectedTipo() === 'queja' ? 'btn-danger' : 'btn-outline-danger'"
                      (click)="selectedTipo.set('queja')"
                    >
                      <i class="bi bi-emoji-frown me-1"></i>Queja
                    </button>
                    <button
                      class="btn btn-sm"
                      [class]="selectedTipo() === 'sugerencia' ? 'btn-primary' : 'btn-outline-primary'"
                      (click)="selectedTipo.set('sugerencia')"
                    >
                      <i class="bi bi-lightbulb me-1"></i>Sugerencia
                    </button>
                    <button
                      class="btn btn-sm"
                      [class]="selectedTipo() === 'opinion' ? 'btn-success' : 'btn-outline-success'"
                      (click)="selectedTipo.set('opinion')"
                    >
                      <i class="bi bi-chat-heart me-1"></i>Opinión
                    </button>
                  </div>
                </div>

                <!-- Texto del mensaje -->
                <div class="mb-3">
                  <label for="mensaje" class="form-label fw-semibold">Tu mensaje</label>
                  <div class="position-relative">
                    <textarea
                      id="mensaje"
                      class="form-control"
                      rows="4"
                      [(ngModel)]="texto"
                      [maxlength]="maxLength"
                      placeholder="Escribe aquí tu queja, sugerencia u opinión..."
                    ></textarea>
                    <small
                      class="position-absolute bottom-0 end-0 me-2 mb-1"
                      [class.text-danger]="texto.length >= maxLength"
                      style="font-size: 0.75rem; color: #999;"
                    >
                      {{ texto.length }}/{{ maxLength }}
                    </small>
                  </div>
                </div>

                @if (error()) {
                  <div class="alert alert-danger py-2 small mb-3">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{ error() }}
                  </div>
                }

                <button
                  class="btn btn-primary w-100"
                  (click)="enviar()"
                  [disabled]="enviando() || !texto.trim() || !selectedTipo()"
                >
                  @if (enviando()) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Enviando...
                  } @else {
                    <i class="bi bi-send me-1"></i> Enviar mensaje
                  }
                </button>

                <p class="text-muted small text-center mt-3 mb-0">
                  <i class="bi bi-shield-check me-1"></i>Tu mensaje será revisado por nuestro equipo.
                </p>
              </div>
            </div>
          }

        </div>
      </div>
    </div>
  `,
})
export class BuzonComponent {
  private mensajeSvc = inject(MensajeService);

  readonly maxLength = MAX_MESSAGE_LENGTH;

  selectedTipo = signal<TipoMensaje | null>(null);
  texto = '';
  enviando = signal(false);
  enviado = signal(false);
  error = signal('');

  async enviar() {
    const tipo = this.selectedTipo();
    if (!tipo) {
      this.error.set('Selecciona el tipo de mensaje.');
      return;
    }

    this.error.set('');
    this.enviando.set(true);

    try {
      const result = await this.mensajeSvc.enviar(
        this.texto,
        tipo,
        'buzon',
      );
      if (result.success) {
        this.enviado.set(true);
      } else {
        this.error.set(result.error ?? 'Error al enviar.');
      }
    } catch {
      this.error.set('Error de conexión. Intenta de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }

  resetForm() {
    this.texto = '';
    this.selectedTipo.set(null);
    this.enviado.set(false);
    this.error.set('');
  }
}
