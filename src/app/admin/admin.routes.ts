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
    path: 'subjects',
    loadComponent: () =>
      import('./subjects/subjects.component').then(
        (m) => m.SubjectsComponent,
      ),
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
];
