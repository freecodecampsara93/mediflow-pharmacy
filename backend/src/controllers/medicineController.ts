import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapMedicine } from '../utils/mappers';
import { buildPaginationMeta, getPagination } from '../utils/pagination';

const BASE_SELECT = `
  SELECT m.*, c.name AS category_name,
         COALESCE(i.total_stock, 0) AS total_stock,
         COALESCE(i.minimum_stock, 0) AS minimum_stock
  FROM medicines m
  LEFT JOIN categories c ON c.id = m.category_id
  LEFT JOIN inventory i ON i.medicine_id = m.id
`;

export const listMedicines = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role === 'admin';
  const { search, category, manufacturer, minPrice, maxPrice, inStock } = req.query as Record<string, string>;
  const { page, limit, offset } = getPagination(req);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!isAdmin) {
    conditions.push('m.active = TRUE');
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(m.name) LIKE $${params.length} OR LOWER(m.sku) LIKE $${params.length} OR LOWER(m.manufacturer) LIKE $${params.length})`
    );
  }
  if (category) {
    params.push(category);
    conditions.push(`m.category_id = $${params.length}`);
  }
  if (manufacturer) {
    params.push(`%${manufacturer.toLowerCase()}%`);
    conditions.push(`LOWER(m.manufacturer) LIKE $${params.length}`);
  }
  if (minPrice) {
    params.push(Number(minPrice));
    conditions.push(`m.price >= $${params.length}`);
  }
  if (maxPrice) {
    params.push(Number(maxPrice));
    conditions.push(`m.price <= $${params.length}`);
  }
  if (inStock === 'true') {
    conditions.push(`COALESCE(i.total_stock, 0) > 0`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM medicines m LEFT JOIN inventory i ON i.medicine_id = m.id ${whereClause}`,
    params
  );
  const total = countResult.rows[0].count;

  params.push(limit);
  params.push(offset);
  const dataResult = await pool.query(
    `${BASE_SELECT} ${whereClause} ORDER BY m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    data: dataResult.rows.map(mapMedicine),
    pagination: buildPaginationMeta(page, limit, total),
  });
});

export const getMedicine = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(`${BASE_SELECT} WHERE m.id = $1`, [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Medicine not found.');

  const medicine = result.rows[0];
  if (!medicine.active && req.user?.role !== 'admin') {
    throw AppError.notFound('Medicine not found.');
  }

  res.json({ data: mapMedicine(medicine) });
});

export const createMedicine = asyncHandler(async (req: Request, res: Response) => {
  const {
    name, description, categoryId, manufacturer, sku, price, image, active, prescriptionRequired,
  } = req.body as Record<string, unknown>;

  if (typeof price === 'number' && price < 0) throw AppError.badRequest('Price cannot be negative.');

  const result = await pool.query(
    `INSERT INTO medicines (name, description, category_id, manufacturer, sku, price, image, active, prescription_required)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      name, description ?? null, categoryId ?? null, manufacturer ?? null, sku, price,
      image ?? null, active ?? true, prescriptionRequired ?? false,
    ]
  );

  await pool.query(
    `INSERT INTO inventory (medicine_id, total_stock, minimum_stock) VALUES ($1, 0, 10)
     ON CONFLICT (medicine_id) DO NOTHING`,
    [result.rows[0].id]
  );

  res.status(201).json({ data: mapMedicine(result.rows[0]) });
});

export const updateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const existing = await pool.query('SELECT * FROM medicines WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) throw AppError.notFound('Medicine not found.');
  const current = existing.rows[0];

  const body = req.body as Record<string, unknown>;
  if (typeof body.price === 'number' && body.price < 0) throw AppError.badRequest('Price cannot be negative.');

  const merged = {
    name: body.name ?? current.name,
    description: body.description ?? current.description,
    categoryId: body.categoryId ?? current.category_id,
    manufacturer: body.manufacturer ?? current.manufacturer,
    sku: body.sku ?? current.sku,
    price: body.price ?? current.price,
    image: body.image ?? current.image,
    active: body.active ?? current.active,
    prescriptionRequired: body.prescriptionRequired ?? current.prescription_required,
  };

  const result = await pool.query(
    `UPDATE medicines SET name=$1, description=$2, category_id=$3, manufacturer=$4, sku=$5,
       price=$6, image=$7, active=$8, prescription_required=$9
     WHERE id = $10 RETURNING *`,
    [
      merged.name, merged.description, merged.categoryId, merged.manufacturer, merged.sku,
      merged.price, merged.image, merged.active, merged.prescriptionRequired, req.params.id,
    ]
  );

  res.json({ data: mapMedicine(result.rows[0]) });
});

export const deleteMedicine = asyncHandler(async (req: Request, res: Response) => {
  const referenced = await pool.query('SELECT id FROM order_items WHERE medicine_id = $1 LIMIT 1', [req.params.id]);
  if (referenced.rowCount) {
    throw AppError.conflict('Cannot delete a medicine that appears in existing orders. Deactivate it instead.');
  }

  const result = await pool.query('DELETE FROM medicines WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Medicine not found.');
  res.status(204).send();
});
