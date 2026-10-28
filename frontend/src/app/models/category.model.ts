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

export interface CategoryPayload {
  name: string;
  description?: string | null;
  image?: string | null;
  active?: boolean;
}
