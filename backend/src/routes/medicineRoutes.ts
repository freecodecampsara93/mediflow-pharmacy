import { Router } from 'express';
import { body } from 'express-validator';
import * as medicineController from '../controllers/medicineController';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const medicineValidators = [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Name is required (2-200 chars).'),
  body('sku').trim().isLength({ min: 1, max: 64 }).withMessage('SKU is required.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number.'),
];

router.get('/', optionalAuthenticate, medicineController.listMedicines);
router.get('/:id', optionalAuthenticate, medicineController.getMedicine);

router.post('/', authenticate, requireAdmin, medicineValidators, validate, medicineController.createMedicine);
router.put('/:id', authenticate, requireAdmin, medicineController.updateMedicine);
router.delete('/:id', authenticate, requireAdmin, medicineController.deleteMedicine);

export default router;
