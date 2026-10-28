import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Order, OrderStatus, Pagination } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState, Paginator],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css',
})
export class AdminOrders implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly orders = signal<Order[]>([]);
  protected readonly pagination = signal<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  protected readonly statusFilter = signal<OrderStatus | ''>('');

  protected readonly statuses: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.adminService.listOrders(this.statusFilter(), page).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load orders.'));
        this.loading.set(false);
      },
    });
  }

  onFilterChange(value: string): void {
    this.statusFilter.set(value as OrderStatus | '');
    this.load(1);
  }

  statusTone(status: string): string {
    if (status === 'delivered') return 'badge-success';
    if (status === 'cancelled') return 'badge-danger';
    if (status === 'pending') return 'badge-warning';
    return 'badge-neutral';
  }
}
