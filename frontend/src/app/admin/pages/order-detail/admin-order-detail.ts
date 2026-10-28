import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order, ORDER_STATUSES, OrderStatus } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState],
  templateUrl: './admin-order-detail.html',
  styleUrl: './admin-order-detail.css',
})
export class AdminOrderDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly order = signal<Order | null>(null);
  protected readonly updating = signal(false);
  protected selectedStatus: OrderStatus | '' = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.adminService.getOrder(id).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.selectedStatus = res.data.status;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load this order.'));
        this.loading.set(false);
      },
    });
  }

  get availableStatuses(): OrderStatus[] {
    const current = this.order()?.status;
    if (!current || current === 'delivered' || current === 'cancelled') {
      return current ? [current] : ORDER_STATUSES;
    }
    const currentIndex = ORDER_STATUSES.indexOf(current);
    const forward = ORDER_STATUSES.slice(currentIndex).filter((s) => s !== 'cancelled');
    return [...forward, 'cancelled'];
  }

  updateStatus(): void {
    const ord = this.order();
    if (!ord || !this.selectedStatus || this.selectedStatus === ord.status) return;

    this.updating.set(true);
    this.adminService.updateOrderStatus(ord.id, this.selectedStatus).subscribe({
      next: (res) => {
        this.order.set({ ...ord, ...res.data });
        this.updating.set(false);
        this.toast.success('Order status updated.');
      },
      error: (err) => {
        this.updating.set(false);
        this.toast.error(friendlyError(err, 'Could not update order status.'));
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
