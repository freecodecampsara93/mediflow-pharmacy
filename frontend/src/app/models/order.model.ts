export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery' | 'mock_payment';

export interface OrderItem {
  id: number;
  orderId: number;
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

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
  customerName?: string;
  customerEmail?: string;
  items?: OrderItem[];
  payment?: Payment | null;
}

export interface Payment {
  id: number;
  orderId: number;
  method: PaymentMethod;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  transactionRef: string | null;
  createdAt: string;
}

export interface CreateOrderPayload {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
}

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];
