import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/', orderController.createOrder);
router.get('/', orderController.listMyOrders);
router.get('/:id', orderController.getMyOrder);

export default router;
