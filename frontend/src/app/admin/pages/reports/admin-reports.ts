import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { Batch, DashboardStats, Inventory } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, LoadingSpinner, EmptyState, StatCard],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.css',
})
export class AdminReports implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly inventoryService = inject(InventoryService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly lowStock = signal<Inventory[]>([]);
  protected readonly expiringSoon = signal<Batch[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      stats: this.adminService.dashboard(),
      lowStock: this.inventoryService.lowStock(),
      expiringSoon: this.inventoryService.expiringSoon(),
    }).subscribe({
      next: (res) => {
        this.stats.set(res.stats);
        this.lowStock.set(res.lowStock.data.slice(0, 8));
        this.expiringSoon.set(res.expiringSoon.data.slice(0, 8));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load reports.'));
        this.loading.set(false);
      },
    });
  }
}
