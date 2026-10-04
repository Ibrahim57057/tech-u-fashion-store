import { Router } from 'express';
import {
    getDeliveryZones,
    createDeliveryZone,
    updateDeliveryZone,
    deleteDeliveryZone,
} from './delivery.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createDeliveryZoneSchema, updateDeliveryZoneSchema } from './delivery.schema.js';

const router = Router();

router.get('/', getDeliveryZones); // public: checkout needs it before login

// Validated like every other write. These used to pass req.body straight to
// Mongoose, so an admin request could set createdAt/updatedAt by hand, and a
// negative fee — which quietly reduces the order total the server computes —
// was accepted.
router.post('/', protect, restrictTo('admin'), validate(createDeliveryZoneSchema), createDeliveryZone);
router.patch('/:id', protect, restrictTo('admin'), validate(updateDeliveryZoneSchema), updateDeliveryZone);
router.delete('/:id', protect, restrictTo('admin'), deleteDeliveryZone);

export default router;