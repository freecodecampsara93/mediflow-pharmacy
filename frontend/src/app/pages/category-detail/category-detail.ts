import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CategoryService } from '../../core/services/category.service';
import { MedicineService } from '../../core/services/medicine.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { Category, Medicine } from '../../models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { friendlyError } from '../../shared/utils/error.util';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [RouterLink, LoadingSpinner, EmptyState, ProductCard],
  templateUrl: './category-detail.html',
  styleUrl: './category-detail.css',
})
export class CategoryDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly medicineService = inject(MedicineService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly category = signal<Category | null>(null);
  protected readonly medicines = signal<Medicine[]>([]);

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
    this.categoryService.get(id).subscribe({
      next: (res) => {
        this.category.set(res.data);
        this.medicineService.list({ category: id, limit: 24 }).subscribe({
          next: (medRes) => {
            this.medicines.set(medRes.data);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(friendlyError(err, 'Could not load medicines for this category.'));
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(friendlyError(err, 'Could not load this category.'));
        this.loading.set(false);
      },
    });
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
      error: (err) => this.toast.error(friendlyError(err)),
    });
  }

  toggleWishlist(medicine: Medicine): void {
    if (!this.auth.isAuthenticated()) {
      this.toast.info('Please log in to use your wishlist.');
      this.router.navigate(['/login']);
      return;
    }
    if (this.wishlistService.isWishlisted(medicine.id)) {
      this.wishlistService.remove(medicine.id).subscribe({ next: () => this.toast.success('Removed from wishlist.') });
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
