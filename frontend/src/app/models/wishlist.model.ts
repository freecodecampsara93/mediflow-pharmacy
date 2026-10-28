export interface WishlistItem {
  medicineId: number;
  name: string;
  price: number;
  image: string | null;
  active: boolean;
  availableStock: number;
  addedAt: string;
}
