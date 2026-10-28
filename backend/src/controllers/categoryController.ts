import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { mapCategory } from '../utils/mappers';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
  const result = await pool.query(
    `SELECT * FROM categories ${includeInactive ? '' : 'WHERE active = TRUE'} ORDER BY name ASC`
  );
  res.json({ data: result.rows.map(mapCategory) });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Category not found.');
  res.json({ data: mapCategory(result.rows[0]) });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, image } = req.body as { name: string; description?: string; image?: string };
  const slug = slugify(name);

  const result = await pool.query(
    `INSERT INTO categories (name, slug, description, image) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, slug, description ?? null, image ?? null]
  );
  res.status(201).json({ data: mapCategory(result.rows[0]) });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, image, active } = req.body as {
    name?: string; description?: string; image?: string; active?: boolean;
  };

  const existing = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) throw AppError.notFound('Category not found.');

  const current = existing.rows[0];
  const newName = name ?? current.name;
  const slug = name ? slugify(name) : current.slug;

  const result = await pool.query(
    `UPDATE categories SET name = $1, slug = $2, description = $3, image = $4, active = $5
     WHERE id = $6 RETURNING *`,
    [
      newName,
      slug,
      description ?? current.description,
      image ?? current.image,
      active ?? current.active,
      req.params.id,
    ]
  );
  res.json({ data: mapCategory(result.rows[0]) });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const inUse = await pool.query('SELECT id FROM medicines WHERE category_id = $1 LIMIT 1', [req.params.id]);
  if (inUse.rowCount) {
    throw AppError.conflict('Cannot delete a category that still has medicines assigned to it.');
  }

  const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rowCount) throw AppError.notFound('Category not found.');
  res.status(204).send();
});
