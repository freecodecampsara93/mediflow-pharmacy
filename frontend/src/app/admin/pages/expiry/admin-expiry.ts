import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { Batch } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../../shared/utils/error.util';

type ExpiryTab = 'expiring' | 'expired';

@Component({
  selector: 'app-admin-expiry',
  standalone: true,
  imports: [FormsModule, DatePipe, LoadingSpinner, EmptyState],
  templateUrl: './admin-expiry.html',
  styleUrl: './admin-expiry.css',
})
export class AdminExpiry implements OnInit {
  private readonly inventoryService = inject(InventoryService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly batches = signal<Batch[]>([]);
  protected readonly tab = signal<ExpiryTab>('expiring');
  protected days = 30;

  ngOnInit(): void {
    this.load();
  }

  setTab(tab: ExpiryTab): void {
    this.tab.set(tab);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const request =
      this.tab() === 'expiring' ? this.inventoryService.expiringSoon(this.days) : this.inventoryService.expired();

    request.subscribe({
      next: (res) => {
        this.batches.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load expiry data.'));
        this.loading.set(false);
      },
    });
  }
}
