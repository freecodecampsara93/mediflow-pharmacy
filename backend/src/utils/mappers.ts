/* Maps raw snake_case PostgreSQL rows to camelCase API model objects. */

export function mapUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    address: row.address,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategory(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMedicine(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name ?? undefined,
    manufacturer: row.manufacturer,
    sku: row.sku,
    price: Number(row.price),
    image: row.image,
    active: row.active,
    prescriptionRequired: row.prescription_required,
    totalStock: row.total_stock !== undefined ? Number(row.total_stock) : undefined,
    minimumStock: row.minimum_stock !== undefined ? Number(row.minimum_stock) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSupplier(row: any) {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBatch(row: any) {
  return {
    id: row.id,
    medicineId: row.medicine_id,
    medicineName: row.medicine_name ?? undefined,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name ?? undefined,
    batchNumber: row.batch_number,
    quantity: Number(row.quantity),
    expiryDate: row.expiry_date,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    expiryStatus: row.expiry_status ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapInventory(row: any) {
  return {
    medicineId: row.medicine_id,
    medicineName: row.medicine_name ?? undefined,
    totalStock: Number(row.total_stock),
    minimumStock: Number(row.minimum_stock),
    updatedAt: row.updated_at,
  };
}

export function mapOrder(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    subtotal: Number(row.subtotal),
    totalAmount: Number(row.total_amount),
    shippingName: row.shipping_name,
    shippingPhone: row.shipping_phone,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrderItem(row: any) {
  return {
    id: row.id,
    orderId: row.order_id,
    medicineId: row.medicine_id,
    medicineName: row.medicine_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  };
}

export function mapPayment(row: any) {
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    status: row.status,
    amount: Number(row.amount),
    transactionRef: row.transaction_ref,
    createdAt: row.created_at,
  };
}
