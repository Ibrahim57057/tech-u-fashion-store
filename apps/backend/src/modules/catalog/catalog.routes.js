import { Router } from 'express';
import {
    getAllProducts,
    getProductBySlug,
    getProductById,
    createProduct,
    updateProduct,
    deactivateProduct,
    bulkDeactivateProducts
} from './catalog.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
    createProductSchema,
    updateProductSchema,
    bulkDeactivateSchema,
} from './catalog.schema.js';
import { upload } from '../../middleware/upload.js';
import { uploadProductImage } from './upload.controller.js';

const router = Router();

router.get('/', getAllProducts);
router.get('/:slug', getProductBySlug);
router.get('/by-id/:id', protect, restrictTo('admin'), getProductById);

router.post(
    '/upload-image',
    protect,
    restrictTo('admin'),
    upload.single('image'),
    uploadProductImage,
);

// Registered above '/:id' on purpose. Express matches in declaration order, so
// a PATCH to /bulk-deactivate was being swallowed by the '/:id' route: the
// update handler ran with id === 'bulk-deactivate', Mongoose threw a CastError,
// and the bulk endpoint answered 500 without ever running.
router.patch('/bulk-deactivate', protect, restrictTo('admin'), validate(bulkDeactivateSchema), bulkDeactivateProducts);

// createProductSchema/updateProductSchema existed in catalog.schema.js but were
// never imported, so both handlers received the raw request body and
// Product.create(req.body) wrote whatever was sent.
router.post('/', protect, restrictTo('admin'), validate(createProductSchema), createProduct);
router.patch('/:id', protect, restrictTo('admin'), validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deactivateProduct);

export default router;