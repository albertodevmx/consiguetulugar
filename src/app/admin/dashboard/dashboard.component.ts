import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ExamenService } from '../../core/services/examen.service';
import { MateriaService } from '../../core/services/materia.service';
import { PreguntaService } from '../../core/services/pregunta.service';
import { MensajeService } from '../../core/services/mensaje.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly examenSvc = inject(ExamenService);
  private readonly materiaSvc = inject(MateriaService);
  private readonly preguntaSvc = inject(PreguntaService);
  private readonly mensajeSvc = inject(MensajeService);

  examenes = toSignal(this.examenSvc.list(), { initialValue: [] });
  materias = toSignal(this.materiaSvc.list(), { initialValue: [] });
  preguntas = toSignal(this.preguntaSvc.adminListAll(500), { initialValue: [] });
  mensajesNuevos = toSignal(this.mensajeSvc.listNuevos(), { initialValue: [] });

  totalMensajesNuevos = computed(() => this.mensajesNuevos().length);
  reportesNuevos = computed(() =>
    this.mensajesNuevos().filter((m) => m.tipo === 'reporte').length,
  );
  feedbackNuevo = computed(() =>
    this.mensajesNuevos().filter((m) => m.tipo !== 'reporte').length,
  );

  totalExamenes = computed(() => this.examenes().length);
  totalMaterias = computed(() => this.materias().length);
  totalPreguntas = computed(() => this.preguntas().length);

  escuelas = computed(() =>
    [...new Set(this.examenes().map((e) => e.escuela))].sort(),
  );

  preguntasPorMateria = computed(() => {
    const materias = this.materias();
    const preguntas = this.preguntas();
    return materias.map((m) => ({
      nombre: m.nombre_canonical,
      count: preguntas.filter((p) => p.materia_id === m.id).length,
    })).filter((m) => m.count > 0).sort((a, b) => b.count - a.count);
  });

  preguntasSinMateria = computed(() =>
    this.preguntas().filter((p) => !p.materia_id).length,
  );

  preguntasConImagen = computed(() =>
    this.preguntas().filter((p) => !!p.imagen_url).length,
  );

  preguntasAI = computed(() =>
    this.preguntas().filter((p) => p.creada_por === 'openai-auto').length,
  );
}
