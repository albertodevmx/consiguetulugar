import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./public/public.routes').then((m) => m.publicRoutes),
      },
    ],
  },
  {
    path: 'dashboard/login',
    loadComponent: () =>
      import('./admin/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./admin/admin.routes').then((m) => m.adminRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
