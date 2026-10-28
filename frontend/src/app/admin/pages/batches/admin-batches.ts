import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BatchService } from '../../../core/services/batch.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { MedicineService } from '../../../core/services/medicine.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { ToastService } from '../../../core/services/toast.service';
import { Batch, Medicine, Supplier } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-batches',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState],
  templateUrl: './admin-batches.html',
  styleUrl: './admin-batches.css',
})
export class AdminBatches implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly batchService = inject(BatchService);
  private readonly medicineService = inject(MedicineService);
  private readonly supplierService = inject(SupplierService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly batches = signal<Batch[]>([]);
  protected readonly medicines = signal<Medicine[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly medicineFilter = signal('');

  protected readonly showModal = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    medicineId: ['', Validators.required],
    supplierId: [''],
    batchNumber: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0)]],
    expiryDate: ['', Validators.required],
    purchasePrice: [0, [Validators.required, Validators.min(0)]],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.medicineService.list({ limit: 100 }).subscribe({ next: (res) => this.medicines.set(res.data) });
    this.supplierService.list(1, 100).subscribe({ next: (res) => this.suppliers.set(res.data) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const medicineId = this.medicineFilter() ? Number(this.medicineFilter()) : undefined;
    this.batchService.list(medicineId).subscribe({
      next: (res) => {
        this.batches.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load batches.'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      medicineId: '',
      supplierId: '',
      batchNumber: '',
      quantity: 0,
      expiryDate: '',
      purchasePrice: 0,
      sellingPrice: 0,
    });
    this.showModal.set(true);
  }

  openEdit(batch: Batch): void {
    this.editingId.set(batch.id);
    this.formError.set('');
    this.form.reset({
      medicineId: String(batch.medicineId),
      supplierId: batch.supplierId ? String(batch.supplierId) : '',
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate.slice(0, 10),
      purchasePrice: batch.purchasePrice,
      sellingPrice: batch.sellingPrice,
    });
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

    const raw = this.form.getRawValue();
    const payload = {
      medicineId: Number(raw.medicineId),
      supplierId: raw.supplierId ? Number(raw.supplierId) : null,
      batchNumber: raw.batchNumber,
      quantity: Number(raw.quantity),
      expiryDate: raw.expiryDate,
      purchasePrice: Number(raw.purchasePrice),
      sellingPrice: Number(raw.sellingPrice),
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.batchService.update(id, payload) : this.batchService.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success(id ? 'Batch updated.' : 'Batch created — inventory updated.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(friendlyError(err, 'Could not save batch.'));
      },
    });
  }

  async remove(batch: Batch): Promise<void> {
    const confirmed = await this.confirmDialog.confirm(
      `Delete batch "${batch.batchNumber}"? This will reduce the medicine's stock accordingly.`,
      { title: 'Delete batch', confirmLabel: 'Delete', danger: true }
    );
    if (!confirmed) return;

    this.batchService.delete(batch.id).subscribe({
      next: () => {
        this.toast.success('Batch deleted.');
        this.load();
      },
      error: (err) => this.toast.error(friendlyError(err, 'Could not delete batch.')),
    });
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date(new Date().toDateString());
  }
}
