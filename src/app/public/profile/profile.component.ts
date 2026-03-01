import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { ProgresoService } from '../../core/services/progreso.service';
import { TemaService } from '../../core/services/tema.service';
import { MateriaService } from '../../core/services/materia.service';
import { calcularDominio } from '../../core/models';

export interface MateriaProgreso {
  materia_id: string;
  nombre: string;
  total: number;
  correctas: number;
  dominio: number;
  acierto: number;
  temas: TemaProgreso[];
}

export interface TemaProgreso {
  nombre: string;
  total: number;
  correctas: number;
  dominio: number;
  acierto: number;
  falladas: number;
}

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
  private progresoSvc = inject(ProgresoService);
  private temaSvc = inject(TemaService);
  private materiaSvc = inject(MateriaService);

  profile = this.auth.profile;
  profileLoaded = this.auth.profileLoaded;

  editing = signal(false);
  saving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Real-time progress data
  private allProgreso = toSignal(this.progresoSvc.getAllProgreso$(), { initialValue: [] });
  private allTemas = toSignal(this.temaSvc.list(), { initialValue: [] });
  private allMaterias = toSignal(this.materiaSvc.list(), { initialValue: [] });

  progresoLoaded = computed(() => true);

  overallTotal = computed(() =>
    this.allProgreso().reduce((sum, p) => sum + (p.total ?? 0), 0),
  );

  overallCorrectas = computed(() =>
    this.allProgreso().reduce((sum, p) => sum + (p.correctas ?? 0), 0),
  );

  overallAcierto = computed(() => {
    const total = this.overallTotal();
    if (total === 0) return 0;
    return Math.round((this.overallCorrectas() / total) * 100);
  });

  overallDominio = computed(() =>
    calcularDominio(this.overallCorrectas(), this.overallTotal()),
  );

  materiaProgreso = computed(() => {
    const progreso = this.allProgreso();
    const temas = this.allTemas();
    const materias = this.allMaterias();

    if (progreso.length === 0) return [];

    const temaMap = new Map(temas.map((t) => [t.id!, t.nombre_canonical]));
    const materiaMap = new Map(materias.map((m) => [m.id!, m.nombre_canonical]));

    const byMateria = new Map<string, { total: number; correctas: number; temas: TemaProgreso[] }>();

    for (const p of progreso) {
      if (!byMateria.has(p.materia_id)) {
        byMateria.set(p.materia_id, { total: 0, correctas: 0, temas: [] });
      }
      const m = byMateria.get(p.materia_id)!;
      m.total += p.total ?? 0;
      m.correctas += p.correctas ?? 0;
      const correctas = p.correctas ?? 0;
      const total = p.total ?? 0;
      m.temas.push({
        nombre: temaMap.get(p.tema_id) ?? p.tema_id,
        total,
        correctas,
        dominio: calcularDominio(correctas, total),
        acierto: total > 0 ? Math.round((correctas / total) * 100) : 0,
        falladas: p.falladas?.length ?? 0,
      });
    }

    const materiasArr: MateriaProgreso[] = [];
    for (const [id, data] of byMateria) {
      data.temas.sort((a, b) => a.nombre.localeCompare(b.nombre));
      materiasArr.push({
        materia_id: id,
        nombre: materiaMap.get(id) ?? id,
        total: data.total,
        correctas: data.correctas,
        dominio: calcularDominio(data.correctas, data.total),
        acierto: data.total > 0 ? Math.round((data.correctas / data.total) * 100) : 0,
        temas: data.temas,
      });
    }
    materiasArr.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return materiasArr;
  });

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

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/']);
  }

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
