import { Component, Input } from '@angular/core';

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css',
})
export class StatCard {
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() icon = '';
  @Input() tone: StatTone = 'primary';
  @Input() hint = '';
}
