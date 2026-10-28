import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly order = signal<Order | null>(null);

  protected readonly statusSteps = ['pending', 'confirmed', 'processing', 'ready', 'delivered'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.orderService.getMine(id).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load this order.'));
        this.loading.set(false);
      },
    });
  }

  stepIndex(status: string): number {
    return this.statusSteps.indexOf(status);
  }
}
