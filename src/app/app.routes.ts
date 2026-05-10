import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'quiz' },
  {
    path: 'quiz',
    loadComponent: () => import('./quiz/quiz.component').then(m => m.QuizComponent),
  },
  {
    path: 'intervals',
    loadComponent: () => import('./intervals/intervals.component').then(m => m.IntervalsComponent),
  },
  {
    path: 'tuner',
    loadComponent: () => import('./tuner/tuner.component').then(m => m.TunerComponent),
  },
  {
    path: 'melody',
    loadComponent: () => import('./melody/melody.component').then(m => m.MelodyComponent),
  },
  {
    path: 'scales',
    loadComponent: () => import('./scales/scales.component').then(m => m.ScalesComponent),
  },
];
