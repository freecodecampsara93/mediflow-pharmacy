import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sidebarOpen = signal(false);

  protected readonly navItems: AdminNavItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Medicines', path: '/admin/medicines', icon: '💊' },
    { label: 'Categories', path: '/admin/categories', icon: '🗂️' },
    { label: 'Inventory', path: '/admin/inventory', icon: '📦' },
    { label: 'Suppliers', path: '/admin/suppliers', icon: '🚚' },
    { label: 'Batches', path: '/admin/batches', icon: '🧪' },
    { label: 'Expiry Tracking', path: '/admin/expiry', icon: '⏳' },
    { label: 'Orders', path: '/admin/orders', icon: '🧾' },
    { label: 'Customers', path: '/admin/customers', icon: '👥' },
    { label: 'Reports', path: '/admin/reports', icon: '📈' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
