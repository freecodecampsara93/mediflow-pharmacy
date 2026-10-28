import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CategoryService } from '../../core/services/category.service';
import { MedicineService } from '../../core/services/medicine.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { Category, Medicine, Pagination } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Paginator } from '../../shared/components/paginator/paginator';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [FormsModule, ProductCard, LoadingSpinner, EmptyState, Paginator],
  templateUrl: './medicines.html',
  styleUrl: './medicines.css',
})
export class Medicines implements OnInit {
  private readonly medicineService = inject(MedicineService);
  private readonly categoryService = inject(CategoryService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly medicines = signal<Medicine[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly pagination = signal<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });

  protected search = '';
  protected categoryId = '';
  protected minPrice: number | null = null;
  protected maxPrice: number | null = null;
  protected inStockOnly = false;
  private currentPage = 1;

  ngOnInit(): void {
    this.categoryService.list().subscribe({ next: (res) => this.categories.set(res.data) });

    this.route.queryParamMap.subscribe((params) => {
      this.search = params.get('search') ?? '';
      this.categoryId = params.get('category') ?? '';
      this.currentPage = Number(params.get('page') ?? 1);
      this.load();
    });

    if (this.auth.isAuthenticated()) {
      this.wishlistService.refresh().subscribe({ error: () => undefined });
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.medicineService
      .list({
        search: this.search || undefined,
        category: this.categoryId || undefined,
        minPrice: this.minPrice ?? undefined,
        maxPrice: this.maxPrice ?? undefined,
        inStock: this.inStockOnly || undefined,
        page: this.currentPage,
        limit: 12,
      })
      .subscribe({
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

  applyFilters(): void {
    this.currentPage = 1;
    this.updateQueryParams();
  }

  clearFilters(): void {
    this.search = '';
    this.categoryId = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.inStockOnly = false;
    this.currentPage = 1;
    this.updateQueryParams();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.search || null,
        category: this.categoryId || null,
        page: this.currentPage > 1 ? this.currentPage : null,
      },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  isWishlisted(id: number): boolean {
    return this.wishlistService.isWishlisted(id);
  }

  addToCart(medicine: Medicine): void {
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to add items to your cart.');
      this.router.navigate(['/login']);
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
      });
    } else {
      this.wishlistService.add(medicine.id).subscribe({
        next: () => {
          this.wishlistService.refresh().subscribe();
          this.toast.success('Added to wishlist.');
        },
      });
    }
  }
}
