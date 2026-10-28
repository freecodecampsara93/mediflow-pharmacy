import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminCustomer, Pagination } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState, Paginator],
  templateUrl: './admin-customers.html',
  styleUrl: './admin-customers.css',
})
export class AdminCustomers implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly customers = signal<AdminCustomer[]>([]);
  protected readonly pagination = signal<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.adminService.listCustomers(page).subscribe({
      next: (res) => {
        this.customers.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load customers.'));
        this.loading.set(false);
      },
    });
  }
}
