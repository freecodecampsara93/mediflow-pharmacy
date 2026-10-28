import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    `SELECT w.medicine_id, w.created_at, m.name, m.price, m.image, m.active,
            COALESCE(i.total_stock, 0) AS total_stock
     FROM wishlist w
     JOIN medicines m ON m.id = w.medicine_id
     LEFT JOIN inventory i ON i.medicine_id = w.medicine_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [req.user!.userId]
  );

  res.json({
    data: result.rows.map((row) => ({
      medicineId: row.medicine_id,
      name: row.name,
      price: Number(row.price),
      image: row.image,
      active: row.active,
      availableStock: Number(row.total_stock),
      addedAt: row.created_at,
    })),
  });
});

export const addToWishlist = asyncHandler(async (req: Request, res: Response) => {
  const medicineId = req.params.medicineId;
  const medicine = await pool.query('SELECT id FROM medicines WHERE id = $1', [medicineId]);
  if (!medicine.rowCount) throw AppError.notFound('Medicine not found.');

  await pool.query(
    `INSERT INTO wishlist (user_id, medicine_id) VALUES ($1, $2)
     ON CONFLICT (user_id, medicine_id) DO NOTHING`,
    [req.user!.userId, medicineId]
  );

  res.status(201).json({ message: 'Added to wishlist.' });
});

export const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND medicine_id = $2', [
    req.user!.userId,
    req.params.medicineId,
  ]);
  res.status(204).send();
});
