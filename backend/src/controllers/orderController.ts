import { Request, Response } from 'express';
import { PoolClient } from 'pg';
import { pool, withTransaction } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapOrder, mapOrderItem, mapPayment } from '../utils/mappers';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import { sendLowStockWebhook, sendOrderWebhook } from '../services/webhookService';
import { PaymentMethod } from '../models/types';

interface PricedItem {
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Deducts `quantity` from non-expired batches (oldest expiry first). Throws if insufficient stock. */
async function deductFromBatchesFefo(client: PoolClient, medicineId: number, quantity: number): Promise<void> {
  const batches = await client.query(
    `SELECT id, quantity FROM batches
     WHERE medicine_id = $1 AND expiry_date >= CURRENT_DATE AND quantity > 0
     ORDER BY expiry_date ASC
     FOR UPDATE`,
    [medicineId]
  );

  let remaining = quantity;
  for (const batch of batches.rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.quantity);
    await client.query('UPDATE batches SET quantity = quantity - $1 WHERE id = $2', [take, batch.id]);
    remaining -= take;
  }

  if (remaining > 0) {
    throw AppError.conflict('Insufficient non-expired stock for one or more items in your cart.', 'INSUFFICIENT_STOCK');
  }
}

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { shippingName, shippingPhone, shippingAddress, paymentMethod } = req.body as {
    shippingName: string; shippingPhone: string; shippingAddress: string; paymentMethod: PaymentMethod;
  };

  if (!shippingName || !shippingPhone || !shippingAddress) {
    throw AppError.badRequest('Shipping name, phone, and address are required.');
  }
  if (!['cash_on_delivery', 'mock_payment'].includes(paymentMethod)) {
    throw AppError.badRequest('Invalid payment method.');
  }

  const userId = req.user!.userId;

  const order = await withTransaction(async (client) => {
    const cartResult = await client.query('SELECT id FROM cart WHERE user_id = $1', [userId]);
    if (!cartResult.rowCount) throw AppError.conflict('Your cart is empty.');
    const cartId = cartResult.rows[0].id;

    const cartItems = await client.query(
      `SELECT ci.medicine_id, ci.quantity, m.name, m.price, m.active
       FROM cart_items ci
       JOIN medicines m ON m.id = ci.medicine_id
       WHERE ci.cart_id = $1
       FOR UPDATE OF ci`,
      [cartId]
    );

    if (!cartItems.rowCount) throw AppError.conflict('Your cart is empty.');

    const pricedItems: PricedItem[] = [];

    for (const item of cartItems.rows) {
      if (!item.active) {
        throw AppError.conflict(`"${item.name}" is no longer available and must be removed from your cart.`);
      }

      const inventoryResult = await client.query(
        'SELECT total_stock FROM inventory WHERE medicine_id = $1 FOR UPDATE',
        [item.medicine_id]
      );
      const availableStock = inventoryResult.rows[0]?.total_stock ?? 0;
      if (item.quantity > availableStock) {
        throw AppError.conflict(`Insufficient stock for "${item.name}".`, 'INSUFFICIENT_STOCK');
      }

      await deductFromBatchesFefo(client, item.medicine_id, item.quantity);

      await client.query('UPDATE inventory SET total_stock = total_stock - $1 WHERE medicine_id = $2', [
        item.quantity,
        item.medicine_id,
      ]);

      const unitPrice = Number(item.price);
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      pricedItems.push({ medicineId: item.medicine_id, medicineName: item.name, quantity: item.quantity, unitPrice, lineTotal });
    }

    const subtotal = Math.round(pricedItems.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;
    const totalAmount = subtotal;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, total_amount, shipping_name, shipping_phone, shipping_address, payment_method)
       VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, subtotal, totalAmount, shippingName, shippingPhone, shippingAddress, paymentMethod]
    );
    const newOrder = orderResult.rows[0];

    for (const item of pricedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, medicine_id, medicine_name, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [newOrder.id, item.medicineId, item.medicineName, item.quantity, item.unitPrice, item.lineTotal]
      );
    }

    const paymentStatus = paymentMethod === 'mock_payment' ? 'paid' : 'pending';
    const transactionRef = paymentMethod === 'mock_payment' ? `MOCK-${newOrder.id}-${Date.now()}` : null;
    await client.query(
      `INSERT INTO payments (order_id, method, status, amount, transaction_ref) VALUES ($1,$2,$3,$4,$5)`,
      [newOrder.id, paymentMethod, paymentStatus, totalAmount, transactionRef]
    );

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    return { order: newOrder, items: pricedItems };
  });

  // Post-commit side effects: never allowed to fail the order itself.
  const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
  const customer = userResult.rows[0];

  sendOrderWebhook({
    orderId: order.order.id,
    customerName: customer?.name ?? 'Unknown',
    customerEmail: customer?.email ?? 'unknown',
    totalAmount: Number(order.order.total_amount),
    status: order.order.status,
    items: order.items.map((i) => ({ medicineName: i.medicineName, quantity: i.quantity, unitPrice: i.unitPrice })),
  });

  for (const item of order.items) {
    const inv = await pool.query(
      'SELECT total_stock, minimum_stock FROM inventory WHERE medicine_id = $1',
      [item.medicineId]
    );
    if (inv.rowCount && inv.rows[0].total_stock < inv.rows[0].minimum_stock) {
      sendLowStockWebhook({
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        remainingStock: Number(inv.rows[0].total_stock),
        minimumStock: Number(inv.rows[0].minimum_stock),
      });
    }
  }

  res.status(201).json({ data: mapOrder(order.order) });
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1', [req.user!.userId]);
  const dataResult = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [req.user!.userId, limit, offset]
  );
  res.json({ data: dataResult.rows.map(mapOrder), pagination: buildPaginationMeta(page, limit, countResult.rows[0].count) });
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!orderResult.rowCount) throw AppError.notFound('Order not found.');
  const order = orderResult.rows[0];

  if (order.user_id !== req.user!.userId && req.user!.role !== 'admin') {
    throw AppError.notFound('Order not found.');
  }

  const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  const paymentResult = await pool.query('SELECT * FROM payments WHERE order_id = $1', [order.id]);

  res.json({
    data: {
      ...mapOrder(order),
      items: itemsResult.rows.map(mapOrderItem),
      payment: paymentResult.rows[0] ? mapPayment(paymentResult.rows[0]) : null,
    },
  });
});
