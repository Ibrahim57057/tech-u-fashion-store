import { Router } from 'express';
import {
    createReturn,
    getMyReturns,
    getAllReturns,
    updateReturn,
} from './returns.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createReturnSchema, updateReturnSchema } from './returns.schema.js';

const router = Router();

router.use(protect); // every route here requires login

router.post('/', validate(createReturnSchema), createReturn);
router.get('/', getMyReturns);

router.get('/admin', restrictTo('staff', 'admin'), getAllReturns);
router.patch('/:id', restrictTo('staff', 'admin'), validate(updateReturnSchema), updateReturn);

export default router;