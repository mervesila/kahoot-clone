import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/logo/logo';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, RouterLink, LogoComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {}
