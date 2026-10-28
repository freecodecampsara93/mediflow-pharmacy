import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css',
})
export class CustomerLayout implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.cart.refresh().subscribe({ error: () => undefined });
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  submitSearch(): void {
    const term = this.searchTerm().trim();
    this.closeMenu();
    this.router.navigate(['/medicines'], { queryParams: term ? { search: term } : {} });
  }

  logout(): void {
    this.auth.logout();
    this.cart.reset();
    this.wishlist.reset();
    this.closeMenu();
    this.router.navigate(['/']);
  }
}
