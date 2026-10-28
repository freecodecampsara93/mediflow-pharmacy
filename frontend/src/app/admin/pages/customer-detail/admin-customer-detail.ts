import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminCustomerDetail } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-customer-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState],
  templateUrl: './admin-customer-detail.html',
  styleUrl: './admin-customer-detail.css',
})
export class AdminCustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly customer = signal<AdminCustomerDetail | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.adminService.getCustomer(id).subscribe({
      next: (res) => {
        this.customer.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load this customer.'));
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
