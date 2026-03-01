import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { take } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ProgresoService } from '../../core/services/progreso.service';
import { TemaService } from '../../core/services/tema.service';
import { MateriaService } from '../../core/services/materia.service';
import { ProgresoTema, Tema, Materia } from '../../core/models';

export interface MateriaProgreso {
  materia_id: string;
  nombre: string;
  total: number;
  correctas: number;
  percent: number;
  temas: TemaProgreso[];
}

export interface TemaProgreso {
  nombre: string;
  total: number;
  correctas: number;
  percent: number;
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

  // Progress data
  progresoLoaded = signal(false);
  overallTotal = signal(0);
  overallCorrectas = signal(0);
  overallPercent = signal(0);
  materiaProgreso = signal<MateriaProgreso[]>([]);

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
    this.loadProgreso();
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

  private async loadProgreso() {
    const [progreso, temas, materias] = await Promise.all([
      this.progresoSvc.getAllProgreso(),
      new Promise<Tema[]>((res) =>
        this.temaSvc.list().pipe(take(1)).subscribe(res),
      ),
      new Promise<Materia[]>((res) =>
        this.materiaSvc.list().pipe(take(1)).subscribe(res),
      ),
    ]);

    if (progreso.length === 0) {
      this.progresoLoaded.set(true);
      return;
    }

    const temaMap = new Map(temas.map((t) => [t.id!, t.nombre_canonical]));
    const materiaMap = new Map(materias.map((m) => [m.id!, m.nombre_canonical]));

    // Aggregate
    let totalGeneral = 0;
    let correctasGeneral = 0;

    const byMateria = new Map<string, { total: number; correctas: number; temas: TemaProgreso[] }>();

    for (const p of progreso) {
      totalGeneral += p.total;
      correctasGeneral += p.correctas ?? 0;

      if (!byMateria.has(p.materia_id)) {
        byMateria.set(p.materia_id, { total: 0, correctas: 0, temas: [] });
      }
      const m = byMateria.get(p.materia_id)!;
      m.total += p.total;
      m.correctas += p.correctas ?? 0;
      m.temas.push({
        nombre: temaMap.get(p.tema_id) ?? p.tema_id,
        total: p.total,
        correctas: p.correctas ?? 0,
        percent: p.total > 0 ? Math.round(((p.correctas ?? 0) / p.total) * 100) : 0,
        falladas: p.falladas?.length ?? 0,
      });
    }

    this.overallTotal.set(totalGeneral);
    this.overallCorrectas.set(correctasGeneral);
    this.overallPercent.set(totalGeneral > 0 ? Math.round((correctasGeneral / totalGeneral) * 100) : 0);

    const materiasArr: MateriaProgreso[] = [];
    for (const [id, data] of byMateria) {
      data.temas.sort((a, b) => a.nombre.localeCompare(b.nombre));
      materiasArr.push({
        materia_id: id,
        nombre: materiaMap.get(id) ?? id,
        total: data.total,
        correctas: data.correctas,
        percent: data.total > 0 ? Math.round((data.correctas / data.total) * 100) : 0,
        temas: data.temas,
      });
    }
    materiasArr.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.materiaProgreso.set(materiasArr);
    this.progresoLoaded.set(true);
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
