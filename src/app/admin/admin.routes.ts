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
    path: 'schools',
    loadComponent: () =>
      import('./schools/schools.component').then((m) => m.SchoolsComponent),
  },
  {
    path: 'exam-types',
    loadComponent: () =>
      import('./exam-types/exam-types.component').then(
        (m) => m.ExamTypesComponent,
      ),
  },
  {
    path: 'subjects',
    loadComponent: () =>
      import('./subjects/subjects.component').then(
        (m) => m.SubjectsComponent,
      ),
  },
  {
    path: 'units',
    loadComponent: () =>
      import('./units/units.component').then((m) => m.UnitsComponent),
  },
  {
    path: 'topics',
    loadComponent: () =>
      import('./topics/topics.component').then((m) => m.TopicsComponent),
  },
  {
    path: 'assignments',
    loadComponent: () =>
      import('./assignments/assignments.component').then(
        (m) => m.AssignmentsComponent,
      ),
  },
  {
    path: 'questions',
    loadComponent: () =>
      import('./questions/questions.component').then(
        (m) => m.QuestionsComponent,
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
