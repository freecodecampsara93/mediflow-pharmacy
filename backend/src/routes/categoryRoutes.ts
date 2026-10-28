import { Router } from 'express';
import { body } from 'express-validator';
import * as categoryController from '../controllers/categoryController';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Public, but optionally authenticated so admins can pass ?all=true.
router.get('/', optionalAuthenticate, categoryController.listCategories);
router.get('/:id', categoryController.getCategory);

router.post(
  '/',
  authenticate,
  requireAdmin,
  [body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name is required (2-120 chars).')],
  validate,
  categoryController.createCategory
);

router.put('/:id', authenticate, requireAdmin, categoryController.updateCategory);
router.delete('/:id', authenticate, requireAdmin, categoryController.deleteCategory);

export default router;
