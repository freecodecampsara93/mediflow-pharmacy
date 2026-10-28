import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError';

export function validate(req: Request, _res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const first = result.array()[0];
  next(AppError.badRequest(first.msg as string));
}
