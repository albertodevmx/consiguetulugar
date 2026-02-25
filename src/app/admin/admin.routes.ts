import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'examenes',
    loadComponent: () =>
      import('./examenes/examenes.component').then(
        (m) => m.ExamenesComponent,
      ),
  },
  {
    path: 'materias',
    loadComponent: () =>
      import('./materias/materias.component').then(
        (m) => m.MateriasComponent,
      ),
  },
  {
    path: 'preguntas',
    loadComponent: () =>
      import('./preguntas/preguntas.component').then(
        (m) => m.PreguntasComponent,
      ),
  },
  {
    path: 'diagnostics',
    loadComponent: () =>
      import('./diagnostics/diagnostics.component').then(
        (m) => m.DiagnosticsComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
];
