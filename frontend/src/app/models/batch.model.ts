export type ExpiryStatus = 'expiring_soon' | 'expired';

export interface Batch {
  id: number;
  medicineId: number;
  medicineName?: string;
  supplierId: number | null;
  supplierName?: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  expiryStatus?: ExpiryStatus;
  createdAt: string;
}

export interface BatchPayload {
  medicineId: number;
  supplierId?: number | null;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
}
