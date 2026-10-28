import { Router } from 'express';
import * as cartController from '../controllers/cartController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', cartController.addCartItem);
router.put('/items/:medicineId', cartController.updateCartItem);
router.delete('/items/:medicineId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

export default router;
