import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pagination, Supplier } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-suppliers',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinner, EmptyState, Paginator],
  templateUrl: './admin-suppliers.html',
  styleUrl: './admin-suppliers.css',
})
export class AdminSuppliers implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supplierService = inject(SupplierService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly pagination = signal<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  protected readonly showModal = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    contactPerson: [''],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
    active: [true],
  });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.supplierService.list(page).subscribe({
      next: (res) => {
        this.suppliers.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load suppliers.'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ name: '', contactPerson: '', phone: '', email: '', address: '', active: true });
    this.showModal.set(true);
  }

  openEdit(supplier: Supplier): void {
    this.editingId.set(supplier.id);
    this.formError.set('');
    this.form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      active: supplier.active,
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
      name: raw.name,
      contactPerson: raw.contactPerson || null,
      phone: raw.phone || null,
      email: raw.email || null,
      address: raw.address || null,
      active: raw.active,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.supplierService.update(id, payload) : this.supplierService.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success(id ? 'Supplier updated.' : 'Supplier created.');
        this.load(this.pagination().page);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(friendlyError(err, 'Could not save supplier.'));
      },
    });
  }

  async remove(supplier: Supplier): Promise<void> {
    const confirmed = await this.confirmDialog.confirm(
      `Delete "${supplier.name}"? Suppliers referenced by batches cannot be deleted.`,
      { title: 'Delete supplier', confirmLabel: 'Delete', danger: true }
    );
    if (!confirmed) return;

    this.supplierService.delete(supplier.id).subscribe({
      next: () => {
        this.toast.success('Supplier deleted.');
        this.load(this.pagination().page);
      },
      error: (err) => this.toast.error(friendlyError(err, 'Could not delete supplier.')),
    });
  }
}
