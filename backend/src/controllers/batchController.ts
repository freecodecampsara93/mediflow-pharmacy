import { Request, Response } from 'express';
import { withTransaction } from '../config/db';
import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapBatch } from '../utils/mappers';

const BASE_SELECT = `
  SELECT b.*, m.name AS medicine_name, s.name AS supplier_name
  FROM batches b
  JOIN medicines m ON m.id = b.medicine_id
  LEFT JOIN suppliers s ON s.id = b.supplier_id
`;

export const listBatches = asyncHandler(async (req: Request, res: Response) => {
  const { medicineId, supplierId } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (medicineId) {
    params.push(medicineId);
    conditions.push(`b.medicine_id = $${params.length}`);
  }
  if (supplierId) {
    params.push(supplierId);
    conditions.push(`b.supplier_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`${BASE_SELECT} ${whereClause} ORDER BY b.expiry_date ASC`, params);
  res.json({ data: result.rows.map(mapBatch) });
});

export const getBatch = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(`${BASE_SELECT} WHERE b.id = $1`, [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Batch not found.');
  res.json({ data: mapBatch(result.rows[0]) });
});

export const createBatch = asyncHandler(async (req: Request, res: Response) => {
  const { medicineId, supplierId, batchNumber, quantity, expiryDate, purchasePrice, sellingPrice } =
    req.body as Record<string, unknown>;

  if (typeof quantity === 'number' && quantity < 0) throw AppError.badRequest('Quantity cannot be negative.');

  const batch = await withTransaction(async (client) => {
    const medicine = await client.query('SELECT id FROM medicines WHERE id = $1', [medicineId]);
    if (!medicine.rowCount) throw AppError.badRequest('Medicine does not exist.');

    const inserted = await client.query(
      `INSERT INTO batches (medicine_id, supplier_id, batch_number, quantity, expiry_date, purchase_price, selling_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [medicineId, supplierId ?? null, batchNumber, quantity, expiryDate, purchasePrice, sellingPrice]
    );

    await client.query(
      `INSERT INTO inventory (medicine_id, total_stock, minimum_stock)
       VALUES ($1, $2, 10)
       ON CONFLICT (medicine_id) DO UPDATE SET total_stock = inventory.total_stock + EXCLUDED.total_stock`,
      [medicineId, quantity]
    );

    return inserted.rows[0];
  });

  const withNames = await pool.query(`${BASE_SELECT} WHERE b.id = $1`, [batch.id]);
  res.status(201).json({ data: mapBatch(withNames.rows[0]) });
});

export const updateBatch = asyncHandler(async (req: Request, res: Response) => {
  const existing = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) throw AppError.notFound('Batch not found.');
  const current = existing.rows[0];
  const body = req.body as Record<string, unknown>;

  const newQuantity = (body.quantity as number) ?? current.quantity;
  if (typeof newQuantity === 'number' && newQuantity < 0) throw AppError.badRequest('Quantity cannot be negative.');
  const delta = newQuantity - Number(current.quantity);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE batches SET supplier_id=$1, batch_number=$2, quantity=$3, expiry_date=$4,
         purchase_price=$5, selling_price=$6 WHERE id = $7`,
      [
        body.supplierId ?? current.supplier_id,
        body.batchNumber ?? current.batch_number,
        newQuantity,
        body.expiryDate ?? current.expiry_date,
        body.purchasePrice ?? current.purchase_price,
        body.sellingPrice ?? current.selling_price,
        req.params.id,
      ]
    );

    if (delta !== 0) {
      await client.query(
        `UPDATE inventory SET total_stock = GREATEST(total_stock + $1, 0) WHERE medicine_id = $2`,
        [delta, current.medicine_id]
      );
    }
  });

  const result = await pool.query(`${BASE_SELECT} WHERE b.id = $1`, [req.params.id]);
  res.json({ data: mapBatch(result.rows[0]) });
});

export const deleteBatch = asyncHandler(async (req: Request, res: Response) => {
  const existing = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) throw AppError.notFound('Batch not found.');
  const batch = existing.rows[0];

  await withTransaction(async (client) => {
    await client.query('DELETE FROM batches WHERE id = $1', [req.params.id]);
    await client.query(
      `UPDATE inventory SET total_stock = GREATEST(total_stock - $1, 0) WHERE medicine_id = $2`,
      [batch.quantity, batch.medicine_id]
    );
  });

  res.status(204).send();
});
