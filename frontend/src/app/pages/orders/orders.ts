import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Order, Pagination } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Paginator } from '../../shared/components/paginator/paginator';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState, Paginator],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private readonly orderService = inject(OrderService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly orders = signal<Order[]>([]);
  protected readonly pagination = signal<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.orderService.listMine(page).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load your orders.'));
        this.loading.set(false);
      },
    });
  }

  statusTone(status: string): string {
    if (status === 'delivered') return 'badge-success';
    if (status === 'cancelled') return 'badge-danger';
    if (status === 'pending') return 'badge-warning';
    return 'badge-neutral';
  }
}
