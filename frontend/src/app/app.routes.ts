import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./admin/pages/admin-login/admin-login').then((m) => m.AdminLogin),
      },
      {
        path: '',
        loadComponent: () => import('./admin/layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
        canActivate: [adminGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
          {
            path: 'dashboard',
            loadComponent: () => import('./admin/pages/dashboard/dashboard').then((m) => m.Dashboard),
          },
          {
            path: 'medicines',
            loadComponent: () => import('./admin/pages/medicines/admin-medicines').then((m) => m.AdminMedicines),
          },
          {
            path: 'categories',
            loadComponent: () => import('./admin/pages/categories/admin-categories').then((m) => m.AdminCategories),
          },
          {
            path: 'inventory',
            loadComponent: () => import('./admin/pages/inventory/admin-inventory').then((m) => m.AdminInventory),
          },
          {
            path: 'suppliers',
            loadComponent: () => import('./admin/pages/suppliers/admin-suppliers').then((m) => m.AdminSuppliers),
          },
          {
            path: 'batches',
            loadComponent: () => import('./admin/pages/batches/admin-batches').then((m) => m.AdminBatches),
          },
          {
            path: 'expiry',
            loadComponent: () => import('./admin/pages/expiry/admin-expiry').then((m) => m.AdminExpiry),
          },
          {
            path: 'orders',
            loadComponent: () => import('./admin/pages/orders/admin-orders').then((m) => m.AdminOrders),
          },
          {
            path: 'orders/:id',
            loadComponent: () =>
              import('./admin/pages/order-detail/admin-order-detail').then((m) => m.AdminOrderDetail),
          },
          {
            path: 'customers',
            loadComponent: () => import('./admin/pages/customers/admin-customers').then((m) => m.AdminCustomers),
          },
          {
            path: 'customers/:id',
            loadComponent: () =>
              import('./admin/pages/customer-detail/admin-customer-detail').then((m) => m.AdminCustomerDetailComponent),
          },
          {
            path: 'reports',
            loadComponent: () => import('./admin/pages/reports/admin-reports').then((m) => m.AdminReports),
          },
        ],
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/customer-layout/customer-layout').then((m) => m.CustomerLayout),
    children: [
      { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
      { path: 'medicines', loadComponent: () => import('./pages/medicines/medicines').then((m) => m.Medicines) },
      {
        path: 'medicines/:id',
        loadComponent: () => import('./pages/medicine-detail/medicine-detail').then((m) => m.MedicineDetail),
      },
      { path: 'categories', loadComponent: () => import('./pages/categories/categories').then((m) => m.Categories) },
      {
        path: 'categories/:id',
        loadComponent: () => import('./pages/category-detail/category-detail').then((m) => m.CategoryDetail),
      },
      {
        path: 'cart',
        loadComponent: () => import('./pages/cart/cart').then((m) => m.Cart),
        canActivate: [authGuard],
      },
      {
        path: 'checkout',
        loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
        canActivate: [authGuard],
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders),
        canActivate: [authGuard],
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./pages/order-detail/order-detail').then((m) => m.OrderDetail),
        canActivate: [authGuard],
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./pages/wishlist/wishlist').then((m) => m.Wishlist),
        canActivate: [authGuard],
      },
      { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
      {
        path: 'forgot-password',
        loadComponent: () => import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
      },
      { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.Register) },
      { path: '**', redirectTo: '' },
    ],
  },
];
