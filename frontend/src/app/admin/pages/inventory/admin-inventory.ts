import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ToastService } from '../../../core/services/toast.service';
import { Inventory } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinner, EmptyState],
  templateUrl: './admin-inventory.html',
  styleUrl: './admin-inventory.css',
})
export class AdminInventory implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly inventory = signal<Inventory[]>([]);
  protected readonly lowStockOnly = signal(false);

  protected readonly showModal = signal(false);
  protected readonly editing = signal<Inventory | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    minimumStock: [0, [Validators.required, Validators.min(0)]],
    totalStock: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const request = this.lowStockOnly() ? this.inventoryService.lowStock() : this.inventoryService.list();
    request.subscribe({
      next: (res) => {
        this.inventory.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load inventory.'));
        this.loading.set(false);
      },
    });
  }

  toggleLowStock(): void {
    this.lowStockOnly.update((v) => !v);
    this.load();
  }

  openEdit(item: Inventory): void {
    this.editing.set(item);
    this.formError.set('');
    this.form.reset({ minimumStock: item.minimumStock, totalStock: item.totalStock });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  field(name: string) {
    return this.form.get(name);
  }

  isInvalid(name: string): boolean {
    const control = this.field(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  save(): void {
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const item = this.editing();
    if (!item) return;

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.inventoryService.update(item.medicineId, { minimumStock: raw.minimumStock, totalStock: raw.totalStock }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success('Inventory updated.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(friendlyError(err, 'Could not update inventory.'));
      },
    });
  }

  isLow(item: Inventory): boolean {
    return item.totalStock < item.minimumStock;
  }
}
