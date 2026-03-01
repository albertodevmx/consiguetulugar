import { Component, inject, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MensajeService } from '../../../core/services/mensaje.service';
import { MAX_MESSAGE_LENGTH } from '../../../core/utils/sanitize-message';
import { TipoMensaje, OrigenMensaje } from '../../../core/models';

@Component({
  selector: 'app-feedback-box',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (!showInput()) {
      <button class="btn feedback-toggle-btn" [class]="btnClass()" (click)="showInput.set(true)">
        <i class="bi bi-chat-heart me-2"></i>{{ buttonText() }}
      </button>
    } @else {
      <div class="feedback-form">
        <div class="position-relative">
          <textarea
            class="form-control"
            rows="3"
            [placeholder]="placeholder()"
            [(ngModel)]="texto"
            [maxlength]="maxLength"
          ></textarea>
          <small class="char-count" [class.text-danger]="texto.length >= maxLength">
            {{ texto.length }}/{{ maxLength }}
          </small>
        </div>
        @if (error()) {
          <div class="alert alert-danger py-1 px-2 mt-2 small mb-0">{{ error() }}</div>
        }
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-success btn-sm" (click)="enviar()" [disabled]="enviando() || !texto.trim()">
            @if (enviando()) {
              <span class="spinner-border spinner-border-sm me-1"></span>
            }
            <i class="bi bi-send me-1"></i>Enviar
          </button>
          <button class="btn btn-outline-secondary btn-sm" (click)="cancelar()">Cancelar</button>
        </div>
      </div>
    }

    @if (enviado()) {
      <div class="alert alert-success py-2 px-3 mt-2 small mb-0">
        <i class="bi bi-check-circle me-1"></i>{{ successMessage() }}
      </div>
    }
  `,
  styles: [`
    .feedback-toggle-btn {
      border-radius: 50px;
      padding: 0.5rem 1.25rem;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .feedback-toggle-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .feedback-form {
      max-width: 480px;
      margin: 0 auto;
    }
    .char-count {
      position: absolute;
      bottom: 4px;
      right: 8px;
      font-size: 0.75rem;
      color: #999;
    }
  `],
})
export class FeedbackBoxComponent {
  private mensajeSvc = inject(MensajeService);

  tipo = input<TipoMensaje>('opinion');
  origen = input<OrigenMensaje>('home');
  buttonText = input('Danos tu opinión');
  placeholder = input('Escribe tu mensaje aquí...');
  successMessage = input('¡Gracias por tu mensaje!');
  btnClass = input('btn-primary');

  readonly maxLength = MAX_MESSAGE_LENGTH;

  showInput = signal(false);
  texto = '';
  enviando = signal(false);
  enviado = signal(false);
  error = signal('');

  async enviar() {
    this.error.set('');
    this.enviando.set(true);
    try {
      const result = await this.mensajeSvc.enviar(
        this.texto,
        this.tipo(),
        this.origen(),
      );
      if (result.success) {
        this.enviado.set(true);
        this.showInput.set(false);
        this.texto = '';
        setTimeout(() => this.enviado.set(false), 4000);
      } else {
        this.error.set(result.error ?? 'Error al enviar.');
      }
    } catch {
      this.error.set('Error de conexión. Intenta de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }

  cancelar() {
    this.showInput.set(false);
    this.texto = '';
    this.error.set('');
  }
}
