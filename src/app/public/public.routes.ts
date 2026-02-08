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
    path: 'explore/:schoolId',
    loadComponent: () =>
      import('./explore/explore-exam-types.component').then(
        (m) => m.ExploreExamTypesComponent,
      ),
  },
  {
    path: 'explore/:schoolId/:examTypeId',
    loadComponent: () =>
      import('./explore/explore-subjects.component').then(
        (m) => m.ExploreSubjectsComponent,
      ),
  },
  {
    path: 'explore/:schoolId/:examTypeId/:subjectId',
    loadComponent: () =>
      import('./explore/explore-units.component').then(
        (m) => m.ExploreUnitsComponent,
      ),
  },
  {
    path: 'practice/topic/:topicId',
    loadComponent: () =>
      import('./topic-practice/topic-practice.component').then(
        (m) => m.TopicPracticeComponent,
      ),
  },
  {
    path: 'practice',
    loadComponent: () =>
      import('./practice/practice.component').then(
        (m) => m.PracticeComponent,
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
