import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BatchService } from '../../core/services/batch.service';
import { CartService } from '../../core/services/cart.service';
import { MedicineService } from '../../core/services/medicine.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { Batch, Medicine } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-medicine-detail',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, LoadingSpinner, EmptyState],
  templateUrl: './medicine-detail.html',
  styleUrl: './medicine-detail.css',
})
export class MedicineDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly medicineService = inject(MedicineService);
  private readonly batchService = inject(BatchService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly medicine = signal<Medicine | null>(null);
  protected readonly nearestExpiry = signal<Batch | null>(null);
  protected readonly quantity = signal(1);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) this.load(id);
    });

    if (this.auth.isAuthenticated()) {
      this.wishlistService.refresh().subscribe({ error: () => undefined });
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.quantity.set(1);
    this.medicineService.get(id).subscribe({
      next: (res) => {
        this.medicine.set(res.data);
        this.loading.set(false);
        // Batch/expiry info is admin-only in the API; only fetch when the current user is an admin.
        if (this.auth.isAdmin()) {
          this.batchService.list(id).subscribe({
            next: (batchRes) => {
              const upcoming = batchRes.data
                .filter((b) => b.quantity > 0)
                .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
              this.nearestExpiry.set(upcoming[0] ?? null);
            },
            error: () => undefined,
          });
        }
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load this medicine.'));
        this.loading.set(false);
      },
    });
  }

  get inStock(): boolean {
    return (this.medicine()?.totalStock ?? 0) > 0;
  }

  get isWishlisted(): boolean {
    const med = this.medicine();
    return med ? this.wishlistService.isWishlisted(med.id) : false;
  }

  increment(): void {
    const max = this.medicine()?.totalStock ?? 1;
    this.quantity.update((q) => Math.min(q + 1, max));
  }

  decrement(): void {
    this.quantity.update((q) => Math.max(q - 1, 1));
  }

  addToCart(): void {
    const med = this.medicine();
    if (!med) return;
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to add items to your cart.');
      this.router.navigate(['/login']);
      return;
    }
    this.cartService.addItem(med.id, this.quantity()).subscribe({
      next: () => this.toast.success(`${med.name} added to cart.`),
      error: (err) => this.toast.error(friendlyError(err, 'Could not add item to cart.')),
    });
  }

  toggleWishlist(): void {
    const med = this.medicine();
    if (!med) return;
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to use your wishlist.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.isWishlisted) {
      this.wishlistService.remove(med.id).subscribe({ next: () => this.toast.success('Removed from wishlist.') });
    } else {
      this.wishlistService.add(med.id).subscribe({
        next: () => {
          this.wishlistService.refresh().subscribe();
          this.toast.success('Added to wishlist.');
        },
      });
    }
  }
}
