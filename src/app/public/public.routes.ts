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
    path: 'practicar',
    loadComponent: () =>
      import('./practicar/practicar-dashboard.component').then(
        (m) => m.PracticarDashboardComponent,
      ),
  },
  {
    path: 'practicar/:escuela/:examenId',
    loadComponent: () =>
      import('./practicar/practicar-subjects.component').then(
        (m) => m.PracticarSubjectsComponent,
      ),
  },
  {
    path: 'lesson/:temaId',
    loadComponent: () =>
      import('./topic-lesson/topic-lesson.component').then(
        (m) => m.TopicLessonComponent,
      ),
  },
  {
    path: 'practice/tema/:temaId',
    loadComponent: () =>
      import('./topic-practice/topic-practice.component').then(
        (m) => m.TopicPracticeComponent,
      ),
  },
  {
    path: 'exam-simulation/:examenId',
    loadComponent: () =>
      import('./exam-simulation/exam-simulation.component').then(
        (m) => m.ExamSimulationComponent,
      ),
  },
  {
    path: 'quick-practice',
    loadComponent: () =>
      import('./quick-practice/quick-practice.component').then(
        (m) => m.QuickPracticeComponent,
      ),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./profile/profile.component').then(
        (m) => m.ProfileComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(
        (m) => m.PublicLoginComponent,
      ),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'suscripcion',
    loadComponent: () =>
      import('./subscription/subscribe.component').then(
        (m) => m.SubscribeComponent,
      ),
  },
  {
    path: 'suscripcion/exito',
    loadComponent: () =>
      import('./subscription/success.component').then(
        (m) => m.SubscriptionSuccessComponent,
      ),
  },
  {
    path: 'suscripcion/cancelado',
    loadComponent: () =>
      import('./subscription/cancel.component').then(
        (m) => m.SubscriptionCancelComponent,
      ),
  },
];
