import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  profile = this.auth.profile;
  profileLoaded = this.auth.profileLoaded;

  editing = signal(false);
  saving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  nombre = '';
  telefono = '';
  bio = '';

  planLabel = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return p.plan === 'premium' ? 'Premium' : 'Gratuito';
  });

  fechaRegistro = computed(() => {
    const p = this.profile();
    if (!p?.fecha_registro) return null;
    return p.fecha_registro.toDate();
  });

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadFormValues();
  }

  loadFormValues() {
    const p = this.profile();
    if (p) {
      this.nombre = p.nombre;
      this.telefono = p.telefono;
      this.bio = p.bio ?? '';
    }
  }

  startEditing() {
    this.loadFormValues();
    this.editing.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  cancelEditing() {
    this.editing.set(false);
    this.errorMessage.set('');
  }

  async saveProfile() {
    if (!this.nombre.trim() || this.nombre.trim().length < 3) {
      this.errorMessage.set('El nombre debe tener al menos 3 caracteres.');
      return;
    }
    if (!this.telefono.trim() || this.telefono.trim().length < 10) {
      this.errorMessage.set('El teléfono debe tener al menos 10 dígitos.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.updateProfile({
        nombre: this.nombre.trim(),
        telefono: this.telefono.trim(),
        bio: this.bio.trim() || null,
      });
      this.editing.set(false);
      this.successMessage.set('Perfil actualizado correctamente.');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch {
      this.errorMessage.set('Error al guardar los cambios. Intenta de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }
}
