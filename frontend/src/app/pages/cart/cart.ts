import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { CartItem } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, LoadingSpinner, EmptyState],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit {
  protected readonly cartService = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly updatingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.cartService.refresh().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load your cart.'));
        this.loading.set(false);
      },
    });
  }

  changeQuantity(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1 || newQty > item.availableStock) return;
    this.updatingId.set(item.medicineId);
    this.cartService.updateItem(item.medicineId, newQty).subscribe({
      next: () => this.updatingId.set(null),
      error: (err) => {
        this.toast.error(friendlyError(err, 'Could not update quantity.'));
        this.updatingId.set(null);
      },
    });
  }

  async removeItem(item: CartItem): Promise<void> {
    const confirmed = await this.confirmDialog.confirm(`Remove "${item.name}" from your cart?`, {
      title: 'Remove item',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!confirmed) return;

    this.cartService.removeItem(item.medicineId).subscribe({
      next: () => this.toast.success('Item removed from cart.'),
      error: (err) => this.toast.error(friendlyError(err)),
    });
  }

  async clearCart(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm('Remove all items from your cart?', {
      title: 'Clear cart',
      confirmLabel: 'Clear cart',
      danger: true,
    });
    if (!confirmed) return;

    this.cartService.clear().subscribe({
      next: () => this.toast.success('Cart cleared.'),
      error: (err) => this.toast.error(friendlyError(err)),
    });
  }
}
