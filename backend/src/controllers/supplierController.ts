import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapSupplier } from '../utils/mappers';
import { buildPaginationMeta, getPagination } from '../utils/pagination';

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req, 20, 100);
  const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM suppliers');
  const dataResult = await pool.query(
    'SELECT * FROM suppliers ORDER BY name ASC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json({
    data: dataResult.rows.map(mapSupplier),
    pagination: buildPaginationMeta(page, limit, countResult.rows[0].count),
  });
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Supplier not found.');
  res.json({ data: mapSupplier(result.rows[0]) });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const { name, contactPerson, phone, email, address, active } = req.body as Record<string, unknown>;
  const result = await pool.query(
    `INSERT INTO suppliers (name, contact_person, phone, email, address, active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, contactPerson ?? null, phone ?? null, email ?? null, address ?? null, active ?? true]
  );
  res.status(201).json({ data: mapSupplier(result.rows[0]) });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const existing = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) throw AppError.notFound('Supplier not found.');
  const current = existing.rows[0];
  const body = req.body as Record<string, unknown>;

  const result = await pool.query(
    `UPDATE suppliers SET name=$1, contact_person=$2, phone=$3, email=$4, address=$5, active=$6
     WHERE id = $7 RETURNING *`,
    [
      body.name ?? current.name,
      body.contactPerson ?? current.contact_person,
      body.phone ?? current.phone,
      body.email ?? current.email,
      body.address ?? current.address,
      body.active ?? current.active,
      req.params.id,
    ]
  );
  res.json({ data: mapSupplier(result.rows[0]) });
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const inUse = await pool.query('SELECT id FROM batches WHERE supplier_id = $1 LIMIT 1', [req.params.id]);
  if (inUse.rowCount) {
    throw AppError.conflict('Cannot delete a supplier referenced by existing batches. Deactivate it instead.');
  }
  const result = await pool.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Supplier not found.');
  res.status(204).send();
});
