import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { JoinPageComponent } from './pages/player/join/join';
import { PlayerEntryComponent } from './pages/player/player-entry/player-entry';
import { PlayerLobbyComponent } from './pages/player/player-lobby/player-lobby';
import { PlayerGameComponent } from './pages/player/player-game/player-game';
import { AdminAuthComponent } from './pages/admin/admin-auth/admin-auth';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard';
import { HostLobbyComponent } from './pages/admin/host-lobby/host-lobby';
import { HostControlComponent } from './pages/admin/host-control/host-control';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'join', component: JoinPageComponent },
  { path: 'player', component: PlayerEntryComponent },
  { path: 'player/lobby', component: PlayerLobbyComponent },
  { path: 'player/game', component: PlayerGameComponent },
  { path: 'login', component: AdminAuthComponent },
  { path: 'admin', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
  },
  {
    path: 'admin/host/:sessionId',
    component: HostLobbyComponent,
    canActivate: [adminGuard],
  },
  {
    path: 'admin/host/:sessionId/control',
    component: HostControlComponent,
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
