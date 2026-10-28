import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CategoryService } from '../../core/services/category.service';
import { MedicineService } from '../../core/services/medicine.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Category, Medicine } from '../../models';
import { friendlyError } from '../../shared/utils/error.util';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ProductCard } from '../../shared/components/product-card/product-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, LoadingSpinner, EmptyState, ProductCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly medicineService = inject(MedicineService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly featured = signal<Medicine[]>([]);
  protected readonly popular = signal<Medicine[]>([]);
  protected readonly searchTerm = signal('');

  ngOnInit(): void {
    this.loading.set(true);
    this.categoryService.list().subscribe({
      next: (res) => this.categories.set(res.data),
      error: () => undefined,
    });

    this.medicineService.list({ limit: 8, page: 1 }).subscribe({
      next: (res) => {
        this.featured.set(res.data.slice(0, 4));
        this.popular.set(res.data.slice(4, 8).length ? res.data.slice(4, 8) : res.data.slice(0, 4));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load medicines right now.'));
        this.loading.set(false);
      },
    });

    if (this.auth.isAuthenticated()) {
      this.wishlistService.refresh().subscribe({ error: () => undefined });
    }
  }

  isWishlisted(id: number): boolean {
    return this.wishlistService.isWishlisted(id);
  }

  onSearch(): void {
    const term = this.searchTerm().trim();
    this.router.navigate(['/medicines'], { queryParams: term ? { search: term } : {} });
  }

  addToCart(medicine: Medicine): void {
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to add items to your cart.');
      this.router.navigate(['/login'], { queryParams: { redirectTo: '/' } });
      return;
    }
    this.cartService.addItem(medicine.id, 1).subscribe({
      next: () => this.toast.success(`${medicine.name} added to cart.`),
      error: (err) => this.toast.error(friendlyError(err, 'Could not add item to cart.')),
    });
  }

  toggleWishlist(medicine: Medicine): void {
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to use your wishlist.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.wishlistService.isWishlisted(medicine.id)) {
      this.wishlistService.remove(medicine.id).subscribe({
        next: () => this.toast.success('Removed from wishlist.'),
        error: (err) => this.toast.error(friendlyError(err)),
      });
    } else {
      this.wishlistService.add(medicine.id).subscribe({
        next: () => {
          this.wishlistService.refresh().subscribe();
          this.toast.success('Added to wishlist.');
        },
        error: (err) => this.toast.error(friendlyError(err)),
      });
    }
  }
}
