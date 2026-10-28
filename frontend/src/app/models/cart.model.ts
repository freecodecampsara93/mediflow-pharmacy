export interface CartItem {
  medicineId: number;
  name: string;
  price: number;
  image: string | null;
  active: boolean;
  availableStock: number;
  quantity: number;
  lineTotal: number;
}

export interface Cart {
  cartId: number;
  items: CartItem[];
  total: number;
}
