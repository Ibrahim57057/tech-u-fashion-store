import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
    register,
    login,
    logout,
    getMe,
    getAllUsers,
    updateUserRole,
    updateUserStatus,
} from './auth.controller.js';
import {
    registerSchema,
    loginSchema,
    updateRoleSchema,
    updateStatusSchema,
} from './auth.schema.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/users', protect, restrictTo('admin'), getAllUsers);

router.patch('/users/:id/role', protect, restrictTo('admin'), validate(updateRoleSchema), updateUserRole);
router.patch(
    '/users/:id/status',
    protect,
    restrictTo('admin'),
    validate(updateStatusSchema),
    updateUserStatus,
);

export default router;