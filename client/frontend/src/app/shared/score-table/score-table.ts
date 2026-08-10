import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { ScoreboardDto } from '../../models/types';

@Component({
  selector: 'app-score-table',
  imports: [DecimalPipe],
  templateUrl: './score-table.html',
  styleUrl: './score-table.scss',
})
export class ScoreTableComponent {
  readonly scoreboard = input.required<ScoreboardDto>();
  readonly highlightPlayerId = input<string | null>(null);
  readonly variant = input<'dark' | 'light'>('dark');

  medal(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  }
}
