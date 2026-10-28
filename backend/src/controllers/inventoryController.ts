import { Request, Response } from 'express';
import { pool } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapBatch, mapInventory } from '../utils/mappers';

export const listInventory = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT i.*, m.name AS medicine_name FROM inventory i
     JOIN medicines m ON m.id = i.medicine_id
     ORDER BY m.name ASC`
  );
  res.json({ data: result.rows.map(mapInventory) });
});

export const lowStock = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT i.*, m.name AS medicine_name FROM inventory i
     JOIN medicines m ON m.id = i.medicine_id
     WHERE i.total_stock < i.minimum_stock AND m.active = TRUE
     ORDER BY (i.minimum_stock - i.total_stock) DESC`
  );
  res.json({ data: result.rows.map(mapInventory) });
});

export const expiringSoon = asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(String(req.query.days ?? env.expiryWarningDays), 10);
  const result = await pool.query(
    `SELECT b.*, m.name AS medicine_name, s.name AS supplier_name
     FROM batches b
     JOIN medicines m ON m.id = b.medicine_id
     LEFT JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.expiry_date >= CURRENT_DATE AND b.expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
     ORDER BY b.expiry_date ASC`,
    [days]
  );
  res.json({ data: result.rows.map((r) => ({ ...mapBatch(r), expiryStatus: 'expiring_soon' })) });
});

export const expired = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT b.*, m.name AS medicine_name, s.name AS supplier_name
     FROM batches b
     JOIN medicines m ON m.id = b.medicine_id
     LEFT JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.expiry_date < CURRENT_DATE
     ORDER BY b.expiry_date ASC`
  );
  res.json({ data: result.rows.map((r) => ({ ...mapBatch(r), expiryStatus: 'expired' })) });
});

export const updateInventory = asyncHandler(async (req: Request, res: Response) => {
  const { minimumStock, totalStock } = req.body as { minimumStock?: number; totalStock?: number };

  if (minimumStock !== undefined && minimumStock < 0) throw AppError.badRequest('minimumStock cannot be negative.');
  if (totalStock !== undefined && totalStock < 0) throw AppError.badRequest('totalStock cannot be negative.');

  const existing = await pool.query('SELECT * FROM inventory WHERE medicine_id = $1', [req.params.medicineId]);
  if (!existing.rowCount) throw AppError.notFound('Inventory record not found for this medicine.');
  const current = existing.rows[0];

  await pool.query(
    `UPDATE inventory SET minimum_stock = $1, total_stock = $2 WHERE medicine_id = $3`,
    [minimumStock ?? current.minimum_stock, totalStock ?? current.total_stock, req.params.medicineId]
  );

  const withName = await pool.query(
    `SELECT i.*, m.name AS medicine_name FROM inventory i JOIN medicines m ON m.id = i.medicine_id WHERE i.medicine_id = $1`,
    [req.params.medicineId]
  );

  res.json({ data: mapInventory(withName.rows[0]) });
});
