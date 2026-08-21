import { Component, input } from '@angular/core';
import type { ScoreboardDto } from '../../models/types';

@Component({
  selector: 'app-score-table',
  imports: [],
  templateUrl: './score-table.html',
  styleUrl: './score-table.scss',
})
export class ScoreTableComponent {
  readonly scoreboard = input.required<ScoreboardDto>();
  readonly highlightPlayerId = input<string | null>(null);
  readonly variant = input<'dark' | 'light'>('dark');

  rankLabel(rank: number): string {
    return `#${rank}`;
  }
}
