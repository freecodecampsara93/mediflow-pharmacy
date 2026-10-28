export interface Inventory {
  medicineId: number;
  medicineName?: string;
  totalStock: number;
  minimumStock: number;
  updatedAt: string;
}

export interface InventoryUpdatePayload {
  minimumStock?: number;
  totalStock?: number;
}
