import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./explore/explore-schools.component').then(
        (m) => m.ExploreSchoolsComponent,
      ),
  },
  {
    path: 'explore/:escuela',
    loadComponent: () =>
      import('./explore/explore-exam-types.component').then(
        (m) => m.ExploreExamTypesComponent,
      ),
  },
  {
    path: 'explore/:escuela/:examenId',
    loadComponent: () =>
      import('./explore/explore-subjects.component').then(
        (m) => m.ExploreSubjectsComponent,
      ),
  },
  {
    path: 'explore/:escuela/:examenId/:materiaId',
    loadComponent: () =>
      import('./explore/explore-units.component').then(
        (m) => m.ExploreUnitsComponent,
      ),
  },
  {
    path: 'practice/tema/:materiaId/:temaId',
    loadComponent: () =>
      import('./topic-practice/topic-practice.component').then(
        (m) => m.TopicPracticeComponent,
      ),
  },
  {
    path: 'quick-practice',
    loadComponent: () =>
      import('./quick-practice/quick-practice.component').then(
        (m) => m.QuickPracticeComponent,
      ),
  },
];
