import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category } from '../../../models';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../../shared/utils/error.util';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinner, EmptyState],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.css',
})
export class AdminCategories implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly categories = signal<Category[]>([]);

  protected readonly showModal = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    image: [''],
    active: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoryService.list(true).subscribe({
      next: (res) => {
        this.categories.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load categories.'));
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ name: '', description: '', image: '', active: true });
    this.showModal.set(true);
  }

  openEdit(cat: Category): void {
    this.editingId.set(cat.id);
    this.formError.set('');
    this.form.reset({
      name: cat.name,
      description: cat.description ?? '',
      image: cat.image ?? '',
      active: cat.active,
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
      description: raw.description || null,
      image: raw.image || null,
      active: raw.active,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.categoryService.update(id, payload) : this.categoryService.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.toast.success(id ? 'Category updated.' : 'Category created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(friendlyError(err, 'Could not save category.'));
      },
    });
  }

  async remove(cat: Category): Promise<void> {
    const confirmed = await this.confirmDialog.confirm(
      `Delete "${cat.name}"? Categories with assigned medicines cannot be deleted.`,
      { title: 'Delete category', confirmLabel: 'Delete', danger: true }
    );
    if (!confirmed) return;

    this.categoryService.delete(cat.id).subscribe({
      next: () => {
        this.toast.success('Category deleted.');
        this.load();
      },
      error: (err) => this.toast.error(friendlyError(err, 'Could not delete category.')),
    });
  }
}
