export type UserRole = 'customer' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  manufacturer: string | null;
  sku: string;
  price: number;
  image: string | null;
  active: boolean;
  prescriptionRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: number;
  medicineId: number;
  supplierId: number | null;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  createdAt: string;
}

export interface Inventory {
  medicineId: number;
  totalStock: number;
  minimumStock: number;
  updatedAt: string;
}

export interface CartItem {
  id: number;
  cartId: number;
  medicineId: number;
  quantity: number;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cash_on_delivery' | 'mock_payment';

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  subtotal: number;
  totalAmount: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: number;
  orderId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionRef: string | null;
  createdAt: string;
}

export interface AuthTokenPayload {
  userId: number;
  role: UserRole;
}
