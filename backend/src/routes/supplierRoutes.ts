import { Router } from 'express';
import { body } from 'express-validator';
import * as supplierController from '../controllers/supplierController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', supplierController.listSuppliers);
router.get('/:id', supplierController.getSupplier);
router.post(
  '/',
  [body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name is required (2-150 chars).')],
  validate,
  supplierController.createSupplier
);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

export default router;
