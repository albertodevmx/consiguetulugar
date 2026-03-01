import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { QuotaService } from '../../core/services/quota.service';
import { ExamenService } from '../../core/services/examen.service';
import { ProgresoService } from '../../core/services/progreso.service';
import { calcularDominio } from '../../core/models';
import { FeedbackBoxComponent } from '../../shared/components/feedback-box/feedback-box.component';

const FRASES_MOTIVACION = [
  '¡Cada pregunta que resuelves te acerca más a tu lugar!',
  '¡Sigue así! La constancia es la clave del éxito.',
  '¡Tú puedes! Cada día estás más preparado.',
  'El esfuerzo de hoy es el éxito de mañana.',
  '¡Vas por buen camino! No te detengas.',
  'La preparación vence al talento cuando el talento no se prepara.',
  '¡Un paso más cerca de tu meta!',
  'Recuerda: quien persevera, alcanza.',
  '¡Excelente! Tu dedicación dará frutos.',
  'Hoy es un gran día para aprender algo nuevo.',
];

@Component({
  selector: 'app-practicar-dashboard',
  standalone: true,
  imports: [RouterLink, FeedbackBoxComponent],
  template: `
    @if (!auth.isLoggedIn()) {
      <div class="container py-5 text-center">
        <i class="bi bi-lock fs-1 text-muted d-block mb-3"></i>
        <h3>Inicia sesión para practicar</h3>
        <p class="text-muted">Necesitas una cuenta para acceder a tu espacio de práctica.</p>
        <a routerLink="/login" class="btn btn-primary me-2">
          <i class="bi bi-box-arrow-in-right me-1"></i>Entrar
        </a>
        <a routerLink="/registro" class="btn btn-warning">
          <i class="bi bi-person-plus me-1"></i>Registrarme
        </a>
      </div>
    } @else if (!auth.profileLoaded()) {
      <div class="container py-5 d-flex justify-content-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>
    } @else if (examenesPagados().length === 0) {
      <div class="container py-5 text-center">
        <i class="bi bi-journal-x fs-1 text-muted d-block mb-3"></i>
        <h3>Aún no tienes materias contratadas</h3>
        <p class="text-muted">Suscríbete a un examen para desbloquear tu espacio de práctica personalizado.</p>
        <a routerLink="/explore" class="btn btn-success me-2">
          <i class="bi bi-search me-1"></i>Explorar exámenes
        </a>
        <a routerLink="/suscripcion" class="btn btn-primary">
          <i class="bi bi-star-fill me-1"></i>Ver planes
        </a>
      </div>
    } @else {
      <div class="container py-4">
        <!-- Welcome + Motivation -->
        <div class="welcome-card mb-4">
          <div class="welcome-content">
            <h2 class="mb-1">
              <i class="bi bi-lightning-charge-fill me-2"></i>¡Hola, {{ nombreUsuario() }}!
            </h2>
            <p class="motivacion mb-0">{{ fraseMotivacion }}</p>
          </div>
        </div>

        <!-- Metrics -->
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-4">
            <div class="metric-card">
              <div class="metric-value">{{ dominioGeneral() }}%</div>
              <div class="metric-label">Dominio general</div>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="metric-card">
              <div class="metric-value">{{ dominioGeneral() }}%</div>
              <div class="metric-label">Porcentaje de dominio</div>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="metric-card">
              <div class="metric-value">{{ temasEstudiados() }}</div>
              <div class="metric-label">Temas estudiados</div>
            </div>
          </div>
        </div>

        <!-- Exam selector or direct link -->
        @if (examenesPagados().length === 1) {
          <h4 class="mb-3"><i class="bi bi-journal-text me-2"></i>Tu examen</h4>
          @if (examenesInfo(); as infos) {
            @if (infos.length > 0) {
              <a [routerLink]="['/practicar', infos[0].escuela, infos[0].id]"
                 class="card exam-card text-decoration-none mb-4">
                <div class="card-body d-flex align-items-center gap-3">
                  <i class="bi bi-mortarboard fs-2 text-primary"></i>
                  <div>
                    <h5 class="mb-0">{{ infos[0].nombre }}</h5>
                    <small class="text-muted">{{ infos[0].escuela }} · {{ infos[0].area }}</small>
                  </div>
                  <i class="bi bi-chevron-right ms-auto fs-4 text-muted"></i>
                </div>
              </a>
            }
          } @else {
            <div class="d-flex justify-content-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            </div>
          }
        } @else {
          <h4 class="mb-3"><i class="bi bi-collection me-2"></i>Tus exámenes</h4>
          @if (examenesInfo(); as infos) {
            <div class="row g-3 mb-4">
              @for (ex of infos; track ex.id) {
                <div class="col-sm-6 col-md-4">
                  <a [routerLink]="['/practicar', ex.escuela, ex.id]"
                     class="card exam-card h-100 text-decoration-none">
                    <div class="card-body text-center">
                      <i class="bi bi-mortarboard fs-1 mb-2 text-primary"></i>
                      <h5 class="card-title mb-1">{{ ex.nombre }}</h5>
                      <p class="text-muted small mb-0">{{ ex.escuela }} · {{ ex.area }}</p>
                    </div>
                  </a>
                </div>
              }
            </div>
          } @else {
            <div class="d-flex justify-content-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            </div>
          }
        }

        <!-- Quick actions -->
        <div class="row g-3">
          <div class="col-sm-6">
            <a routerLink="/quick-practice" class="card action-card h-100 text-decoration-none">
              <div class="card-body d-flex align-items-center gap-3">
                <i class="bi bi-lightning fs-2 text-warning"></i>
                <div>
                  <h6 class="mb-0">Práctica rápida</h6>
                  <small class="text-muted">Responde preguntas al azar</small>
                </div>
              </div>
            </a>
          </div>
          <div class="col-sm-6">
            <a routerLink="/explore" class="card action-card h-100 text-decoration-none">
              <div class="card-body d-flex align-items-center gap-3">
                <i class="bi bi-search fs-2 text-info"></i>
                <div>
                  <h6 class="mb-0">Explorar más exámenes</h6>
                  <small class="text-muted">Descubre otros cursos disponibles</small>
                </div>
              </div>
            </a>
          </div>
        </div>

        <!-- Feedback -->
        <div class="feedback-card mt-4">
          <div class="card">
            <div class="card-body text-center py-3">
              <i class="bi bi-lightbulb text-warning fs-4 d-block mb-1"></i>
              <h6 class="mb-1">¿Qué te gustaría practicar?</h6>
              <p class="text-muted small mb-2">Cuéntanos qué temas, materias o funciones te gustaría que agreguemos.</p>
              <app-feedback-box
                tipo="feedback"
                origen="practicar"
                buttonText="Enviar sugerencia"
                placeholder="¿Qué te gustaría que mejoremos o agreguemos? (máx. 280 caracteres)"
                successMessage="¡Gracias! Tu sugerencia nos ayuda a mejorar."
                btnClass="btn-outline-warning"
              />
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .welcome-card {
      background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
      color: #fff;
      border-radius: 16px;
      padding: 1.5rem 2rem;
    }
    .welcome-content h2 {
      font-size: 1.4rem;
    }
    .motivacion {
      font-size: 1rem;
      opacity: 0.9;
      font-style: italic;
    }

    .metric-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
      height: 100%;
    }
    .metric-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #1a73e8;
      line-height: 1;
    }
    .metric-label {
      font-size: 0.8rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .exam-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
      cursor: pointer;
    }
    .exam-card:hover {
      border-color: var(--bs-primary);
      box-shadow: 0 4px 12px rgba(26, 115, 232, 0.15);
      transform: translateY(-2px);
    }

    .action-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .action-card:hover {
      border-color: var(--bs-warning);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    @media (max-width: 575.98px) {
      .welcome-card {
        padding: 1rem 1.25rem;
      }
      .welcome-content h2 {
        font-size: 1.15rem;
      }
      .metric-value {
        font-size: 1.4rem;
      }
      .metric-label {
        font-size: 0.7rem;
      }
    }
  `],
})
export class PracticarDashboardComponent {
  auth = inject(AuthService);
  private quota = inject(QuotaService);
  private examenSvc = inject(ExamenService);
  private progresoSvc = inject(ProgresoService);
  private router = inject(Router);

  fraseMotivacion = FRASES_MOTIVACION[Math.floor(Math.random() * FRASES_MOTIVACION.length)];

  private progreso = toSignal(this.progresoSvc.getAllProgreso$(), { initialValue: [] });
  private allExamenes = toSignal(this.examenSvc.list(), { initialValue: [] });

  nombreUsuario = computed(() => {
    const p = this.auth.profile();
    return p?.nombre?.split(' ')[0] ?? 'estudiante';
  });

  examenesPagados = computed(() => {
    const p = this.auth.profile();
    return p?.examenes_pagados ?? [];
  });

  examenesInfo = computed(() => {
    const all = this.allExamenes();
    const pagados = this.examenesPagados();
    if (all.length === 0) return undefined;
    return all.filter((e) => pagados.includes(e.id!));
  });

  private totalPreguntas = computed(() =>
    this.progreso().reduce((sum, p) => sum + (p.total ?? 0), 0),
  );

  private totalCorrectas = computed(() =>
    this.progreso().reduce((sum, p) => sum + (p.correctas ?? 0), 0),
  );

  dominioGeneral = computed(() => {
    const total = this.totalPreguntas();
    const correctas = this.totalCorrectas();
    return calcularDominio(correctas, total);
  });

  temasEstudiados = computed(() => this.progreso().length);
}
