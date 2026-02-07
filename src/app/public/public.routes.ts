import { Routes } from '@angular/router';

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'practice',
    loadComponent: () =>
      import('./practice/practice.component').then(
        (m) => m.PracticeComponent,
      ),
  },
];
