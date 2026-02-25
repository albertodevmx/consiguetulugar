import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Configuracion</h2>

    <div class="card" style="max-width: 600px">
      <div class="card-body">
        <h5 class="card-title">OpenAI</h5>
        <p class="text-muted small mb-3">
          La API Key se usa para generar preguntas automaticamente desde la seccion de Temas.
        </p>

        <div class="mb-3">
          <label for="apiKey" class="form-label">API Key</label>
          <input
            type="password"
            class="form-control"
            id="apiKey"
            [ngModel]="apiKey()"
            (ngModelChange)="apiKey.set($event)"
            name="apiKey"
            placeholder="sk-..."
            autocomplete="off"
          />
          <div class="form-text">
            Puedes obtener una en
            <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a>.
          </div>
        </div>

        <div class="mb-3">
          <label for="model" class="form-label">Modelo</label>
          <select
            class="form-select"
            id="model"
            [ngModel]="model()"
            (ngModelChange)="model.set($event)"
            name="model"
          >
            <option value="gpt-4o-mini">gpt-4o-mini (rapido y economico)</option>
            <option value="gpt-4o">gpt-4o (mas preciso)</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            <option value="gpt-4.1">gpt-4.1</option>
          </select>
        </div>

        <button
          class="btn btn-primary"
          (click)="save()"
          [disabled]="saving()"
        >
          @if (saving()) {
            <span class="spinner-border spinner-border-sm me-1"></span>
            Guardando...
          } @else {
            Guardar
          }
        </button>

        @if (msg()) {
          <div class="alert mt-3 mb-0"
            [class.alert-success]="msgType() === 'success'"
            [class.alert-danger]="msgType() === 'error'">
            {{ msg() }}
          </div>
        }
      </div>
    </div>
  `,
})
export class SettingsComponent {
  private readonly fs = inject(Firestore);

  apiKey = signal('');
  model = signal('gpt-4o-mini');
  saving = signal(false);
  msg = signal('');
  msgType = signal<'success' | 'error'>('success');

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const snap = await getDoc(doc(this.fs, 'configuracion', 'openai'));
      if (snap.exists()) {
        const data = snap.data();
        this.apiKey.set(data['apiKey'] ?? '');
        this.model.set(data['model'] ?? 'gpt-4o-mini');
      }
    } catch (e) {
      console.warn('Error loading OpenAI config:', e);
    }
  }

  async save() {
    this.saving.set(true);
    this.msg.set('');

    try {
      await setDoc(doc(this.fs, 'configuracion', 'openai'), {
        apiKey: this.apiKey(),
        model: this.model(),
      });
      this.msg.set('Configuracion guardada correctamente.');
      this.msgType.set('success');
    } catch (e) {
      this.msg.set('Error al guardar: ' + (e as Error).message);
      this.msgType.set('error');
    } finally {
      this.saving.set(false);
    }
  }
}
