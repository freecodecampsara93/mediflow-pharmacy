import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { WishlistItem } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, LoadingSpinner, EmptyState],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class Wishlist implements OnInit {
  protected readonly wishlistService = inject(WishlistService);
  private readonly cartService = inject(CartService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.wishlistService.refresh().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load your wishlist.'));
        this.loading.set(false);
      },
    });
  }

  remove(item: WishlistItem): void {
    this.wishlistService.remove(item.medicineId).subscribe({
      next: () => this.toast.success('Removed from wishlist.'),
      error: (err) => this.toast.error(friendlyError(err)),
    });
  }

  addToCart(item: WishlistItem): void {
    this.cartService.addItem(item.medicineId, 1).subscribe({
      next: () => this.toast.success(`${item.name} added to cart.`),
      error: (err) => this.toast.error(friendlyError(err, 'Could not add item to cart.')),
    });
  }
}
