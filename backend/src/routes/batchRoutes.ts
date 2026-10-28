import { Router } from 'express';
import { body } from 'express-validator';
import * as batchController from '../controllers/batchController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', batchController.listBatches);
router.get('/:id', batchController.getBatch);
router.post(
  '/',
  [
    body('medicineId').isInt({ min: 1 }).withMessage('A valid medicineId is required.'),
    body('batchNumber').trim().notEmpty().withMessage('Batch number is required.'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be zero or a positive integer.'),
    body('expiryDate').isISO8601().withMessage('A valid expiry date is required.'),
    body('purchasePrice').isFloat({ min: 0 }).withMessage('Purchase price must be non-negative.'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be non-negative.'),
  ],
  validate,
  batchController.createBatch
);
router.put('/:id', batchController.updateBatch);
router.delete('/:id', batchController.deleteBatch);

export default router;
