import { Router } from 'express';
import { getWishlist, toggleWishlistItem } from './wishlist.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// A wishlist only makes sense for a known customer, so every route
// here requires login, unlike orders which allow guests.
router.use(protect);

router.get('/', getWishlist);
router.post('/:productId', toggleWishlistItem);

export default router;