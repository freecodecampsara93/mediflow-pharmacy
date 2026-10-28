import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', inventoryController.listInventory);
router.get('/low-stock', inventoryController.lowStock);
router.get('/expiring-soon', inventoryController.expiringSoon);
router.get('/expired', inventoryController.expired);
router.put('/:medicineId', inventoryController.updateInventory);

export default router;
