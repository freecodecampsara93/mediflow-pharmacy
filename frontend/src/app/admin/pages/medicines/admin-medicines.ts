import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CategoryService } from '../../../core/services/category.service';
import { MedicineService } from '../../../core/services/medicine.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category, Medicine, Pagination } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-medicines',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, LoadingSpinner, EmptyState, Paginator],
  templateUrl: './admin-medicines.html',
  styleUrl: './admin-medicines.css',
})
export class AdminMedicines implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly medicineService = inject(MedicineService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly medicines = signal<Medicine[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly pagination = signal<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  protected readonly searchTerm = signal('');

  protected readonly showModal = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  private currentPage = 1;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: ['', Validators.required],
    categoryId: [''],
    manufacturer: [''],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    image: [''],
    prescriptionRequired: [false],
    active: [true],
  });

  ngOnInit(): void {
    this.categoryService.list(true).subscribe({ next: (res) => this.categories.set(res.data) });
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.currentPage = page;
    this.medicineService.list({ search: this.searchTerm() || undefined, page, limit: 10 }).subscribe({
      next: (res) => {
        this.medicines.set(res.data);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load medicines.'));
        this.loading.set(false);
      },
    });
  }

  search(): void {
    this.load(1);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      name: '',
      sku: '',
      categoryId: '',
      manufacturer: '',
      description: '',
      price: 0,
      image: '',
      prescriptionRequired: false,
      active: true,
    });
    this.showModal.set(true);
  }

  openEdit(med: Medicine): void {
    this.editingId.set(med.id);
    this.formError.set('');
    this.form.reset({
      name: med.name,
      sku: med.sku,
      categoryId: med.categoryId ? String(med.categoryId) : '',
      manufacturer: med.manufacturer ?? '',
      description: med.description ?? '',
      price: med.price,
      image: med.image ?? '',
      prescriptionRequired: med.prescriptionRequired,
      active: med.active,
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
      sku: raw.sku,
      categoryId: raw.categoryId ? Number(raw.categoryId) : null,
      manufacturer: raw.manufacturer || null,
      description: raw.description || null,
      price: Number(raw.price),
      image: raw.image || null,
      prescriptionRequired: raw.prescriptionRequired,
      active: raw.active,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.medicineService.update(id, payload) : this.medicineService.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success(id ? 'Medicine updated.' : 'Medicine created.');
        this.load(this.currentPage);
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(friendlyError(err, 'Could not save medicine.'));
      },
    });
  }

  async remove(med: Medicine): Promise<void> {
    const confirmed = await this.confirmDialog.confirm(
      `Delete "${med.name}"? This cannot be undone.`,
      { title: 'Delete medicine', confirmLabel: 'Delete', danger: true }
    );
    if (!confirmed) return;

    this.medicineService.delete(med.id).subscribe({
      next: () => {
        this.toast.success('Medicine deleted.');
        this.load(this.currentPage);
      },
      error: (err) => this.toast.error(friendlyError(err, 'Could not delete medicine.')),
    });
  }
}
