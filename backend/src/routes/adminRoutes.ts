import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getDashboard);

router.get('/orders', adminController.listAllOrders);
router.get('/orders/:id', adminController.getAdminOrder);
router.put('/orders/:id/status', adminController.updateOrderStatus);

router.get('/customers', adminController.listCustomers);
router.get('/customers/:id', adminController.getCustomer);

router.post('/notify/expiring-batches', adminController.notifyExpiringBatches);

export default router;
