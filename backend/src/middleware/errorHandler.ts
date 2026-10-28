import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
  }

  // PostgreSQL unique_violation / foreign_key_violation etc. -> safe generic message
  const pgErr = err as { code?: string; message?: string };
  if (pgErr && typeof pgErr.code === 'string') {
    if (pgErr.code === '23505') {
      return res.status(409).json({ error: { message: 'A record with these details already exists.' } });
    }
    if (pgErr.code === '23503') {
      return res.status(409).json({ error: { message: 'This action conflicts with related data.' } });
    }
    if (pgErr.code === '23514' || pgErr.code === '23502') {
      return res.status(400).json({ error: { message: 'Invalid data provided.' } });
    }
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(env.nodeEnv !== 'production' && err instanceof Error ? { detail: err.message } : {}),
    },
  });
}
