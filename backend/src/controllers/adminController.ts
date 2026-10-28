import { Request, Response } from 'express';
import { pool } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapOrder, mapOrderItem } from '../utils/mappers';
import { buildPaginationMeta, getPagination } from '../utils/pagination';
import { OrderStatus } from '../models/types';
import { sendExpiryWebhook } from '../services/webhookService';

const VALID_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];

export const listAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as { status?: string };
  const { page, limit, offset } = getPagination(req, 20, 100);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM orders ${whereClause}`, params);
  params.push(limit);
  params.push(offset);
  const dataResult = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email FROM orders o
     JOIN users u ON u.id = o.user_id
     ${whereClause} ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    data: dataResult.rows.map((row) => ({ ...mapOrder(row), customerName: row.customer_name, customerEmail: row.customer_email })),
    pagination: buildPaginationMeta(page, limit, countResult.rows[0].count),
  });
});

export const getAdminOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderResult = await pool.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email FROM orders o
     JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
    [req.params.id]
  );
  if (!orderResult.rowCount) throw AppError.notFound('Order not found.');
  const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);

  const row = orderResult.rows[0];
  res.json({
    data: {
      ...mapOrder(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      items: itemsResult.rows.map(mapOrderItem),
    },
  });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: OrderStatus };
  if (!VALID_STATUSES.includes(status)) throw AppError.badRequest('Invalid order status.');

  const result = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Order not found.');

  res.json({ data: mapOrder(result.rows[0]) });
});

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalMedicines, activeMedicines, lowStock, expiringSoon, expired,
    totalSuppliers, totalCustomers, todaysOrders, totalOrders, revenue,
  ] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM medicines'),
    pool.query('SELECT COUNT(*)::int AS count FROM medicines WHERE active = TRUE'),
    pool.query('SELECT COUNT(*)::int AS count FROM inventory WHERE total_stock < minimum_stock'),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM batches WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + ($1 || ' days')::interval`,
      [env.expiryWarningDays]
    ),
    pool.query('SELECT COUNT(*)::int AS count FROM batches WHERE expiry_date < CURRENT_DATE'),
    pool.query('SELECT COUNT(*)::int AS count FROM suppliers'),
    pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'"),
    pool.query("SELECT COUNT(*)::int AS count FROM orders WHERE created_at::date = CURRENT_DATE"),
    pool.query('SELECT COUNT(*)::int AS count FROM orders'),
    pool.query("SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM orders WHERE status != 'cancelled'"),
  ]);

  res.json({
    totalMedicines: totalMedicines.rows[0].count,
    activeMedicines: activeMedicines.rows[0].count,
    lowStock: lowStock.rows[0].count,
    expiringSoon: expiringSoon.rows[0].count,
    expired: expired.rows[0].count,
    totalSuppliers: totalSuppliers.rows[0].count,
    totalCustomers: totalCustomers.rows[0].count,
    todaysOrders: todaysOrders.rows[0].count,
    totalOrders: totalOrders.rows[0].count,
    revenue: Number(revenue.rows[0].total),
  });
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req, 20, 100);

  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'");
  const dataResult = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at,
            COUNT(o.id)::int AS order_count,
            COALESCE(SUM(o.total_amount), 0)::numeric AS order_total
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'customer'
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    data: dataResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.created_at,
      orderCount: row.order_count,
      orderTotal: Number(row.order_total),
    })),
    pagination: buildPaginationMeta(page, limit, countResult.rows[0].count),
  });
});

/**
 * Pushes an n8n webhook for every batch expiring within the configured
 * warning window. Intended to be invoked on a schedule (OS cron or an
 * n8n Schedule Trigger calling this endpoint) rather than per-request.
 */
export const notifyExpiringBatches = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(String(req.query.days ?? env.expiryWarningDays), 10);
  const result = await pool.query(
    `SELECT b.id, b.medicine_id, b.batch_number, b.expiry_date, m.name AS medicine_name
     FROM batches b
     JOIN medicines m ON m.id = b.medicine_id
     WHERE b.expiry_date >= CURRENT_DATE AND b.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval`,
    [days]
  );

  for (const row of result.rows) {
    sendExpiryWebhook({
      medicineId: row.medicine_id,
      medicineName: row.medicine_name,
      batchNumber: row.batch_number,
      expiryDate: row.expiry_date,
    });
  }

  res.json({ notified: result.rowCount });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const userResult = await pool.query("SELECT id, name, email, phone, address, created_at FROM users WHERE id = $1 AND role = 'customer'", [
    req.params.id,
  ]);
  if (!userResult.rowCount) throw AppError.notFound('Customer not found.');

  const ordersResult = await pool.query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
    [req.params.id]
  );

  const user = userResult.rows[0];
  res.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      createdAt: user.created_at,
      recentOrders: ordersResult.rows.map(mapOrder),
    },
  });
});
