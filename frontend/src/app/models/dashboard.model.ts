export interface DashboardStats {
  totalMedicines: number;
  activeMedicines: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
  totalSuppliers: number;
  totalCustomers: number;
  todaysOrders: number;
  totalOrders: number;
  revenue: number;
}

export interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  orderTotal: number;
}

export interface AdminCustomerDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  recentOrders: import('./order.model').Order[];
}
