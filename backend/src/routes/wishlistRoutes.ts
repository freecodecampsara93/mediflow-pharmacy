import { Router } from 'express';
import * as wishlistController from '../controllers/wishlistController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.post('/:medicineId', wishlistController.addToWishlist);
router.delete('/:medicineId', wishlistController.removeFromWishlist);

export default router;
