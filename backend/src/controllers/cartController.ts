import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

async function getOrCreateCartId(userId: number): Promise<number> {
  const existing = await pool.query('SELECT id FROM cart WHERE user_id = $1', [userId]);
  if (existing.rowCount) return existing.rows[0].id;

  const created = await pool.query('INSERT INTO cart (user_id) VALUES ($1) RETURNING id', [userId]);
  return created.rows[0].id;
}

async function getCartPayload(userId: number) {
  const cartId = await getOrCreateCartId(userId);
  const items = await pool.query(
    `SELECT ci.medicine_id, ci.quantity, m.name, m.price, m.image, m.active,
            COALESCE(i.total_stock, 0) AS total_stock
     FROM cart_items ci
     JOIN medicines m ON m.id = ci.medicine_id
     LEFT JOIN inventory i ON i.medicine_id = ci.medicine_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId]
  );

  const mappedItems = items.rows.map((row) => ({
    medicineId: row.medicine_id,
    name: row.name,
    price: Number(row.price),
    image: row.image,
    active: row.active,
    availableStock: Number(row.total_stock),
    quantity: Number(row.quantity),
    lineTotal: Number(row.price) * Number(row.quantity),
  }));

  const total = mappedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return { cartId, items: mappedItems, total: Math.round(total * 100) / 100 };
}

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await getCartPayload(req.user!.userId) });
});

export const addCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { medicineId, quantity } = req.body as { medicineId: number; quantity: number };
  if (!medicineId || !quantity || quantity < 1) throw AppError.badRequest('medicineId and a positive quantity are required.');

  const medicineResult = await pool.query(
    `SELECT m.active, COALESCE(i.total_stock, 0) AS total_stock FROM medicines m
     LEFT JOIN inventory i ON i.medicine_id = m.id WHERE m.id = $1`,
    [medicineId]
  );
  if (!medicineResult.rowCount) throw AppError.notFound('Medicine not found.');
  const medicine = medicineResult.rows[0];
  if (!medicine.active) throw AppError.badRequest('This medicine is not currently available.');
  if (quantity > medicine.total_stock) throw AppError.badRequest('Requested quantity exceeds available stock.');

  const cartId = await getOrCreateCartId(req.user!.userId);
  await pool.query(
    `INSERT INTO cart_items (cart_id, medicine_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, medicine_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [cartId, medicineId, quantity]
  );

  res.status(201).json({ data: await getCartPayload(req.user!.userId) });
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body as { quantity: number };
  if (!quantity || quantity < 1) throw AppError.badRequest('A positive quantity is required.');

  const medicineResult = await pool.query(
    `SELECT COALESCE(i.total_stock, 0) AS total_stock FROM medicines m
     LEFT JOIN inventory i ON i.medicine_id = m.id WHERE m.id = $1`,
    [req.params.medicineId]
  );
  if (!medicineResult.rowCount) throw AppError.notFound('Medicine not found.');
  if (quantity > medicineResult.rows[0].total_stock) throw AppError.badRequest('Requested quantity exceeds available stock.');

  const cartId = await getOrCreateCartId(req.user!.userId);
  const result = await pool.query(
    `UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND medicine_id = $3 RETURNING id`,
    [quantity, cartId, req.params.medicineId]
  );
  if (!result.rowCount) throw AppError.notFound('Item not found in cart.');

  res.json({ data: await getCartPayload(req.user!.userId) });
});

export const removeCartItem = asyncHandler(async (req: Request, res: Response) => {
  const cartId = await getOrCreateCartId(req.user!.userId);
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND medicine_id = $2', [cartId, req.params.medicineId]);
  res.json({ data: await getCartPayload(req.user!.userId) });
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cartId = await getOrCreateCartId(req.user!.userId);
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  res.status(204).send();
});
