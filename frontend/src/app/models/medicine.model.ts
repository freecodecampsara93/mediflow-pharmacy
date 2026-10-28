export interface Medicine {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  categoryName?: string;
  manufacturer: string | null;
  sku: string;
  price: number;
  image: string | null;
  active: boolean;
  prescriptionRequired: boolean;
  totalStock?: number;
  minimumStock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicinePayload {
  name: string;
  description?: string | null;
  categoryId?: number | null;
  manufacturer?: string | null;
  sku: string;
  price: number;
  image?: string | null;
  active?: boolean;
  prescriptionRequired?: boolean;
}

export interface MedicineQuery {
  search?: string;
  category?: number | string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}
