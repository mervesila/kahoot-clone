import { Routes } from '@angular/router';
import { ExamTakeComponent } from './pages/exam/exam-take/exam-take';
import { AdminAuthComponent } from './pages/admin/admin-auth/admin-auth';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard';
import { ExamReportComponent } from './pages/admin/exam-report/exam-report';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: AdminAuthComponent },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
  },
  {
    path: 'admin/exam/:quizId/report',
    component: ExamReportComponent,
    canActivate: [adminGuard],
  },
  { path: 'exam/:quizId', component: ExamTakeComponent },
  { path: '**', redirectTo: 'login' },
];
