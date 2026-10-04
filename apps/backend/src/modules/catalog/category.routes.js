import { Router } from 'express';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from './category.controller.js';
import { protect, restrictTo } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from './catalog.schema.js';

const router = Router();

// Public: anyone can browse the category list, including signed-out shoppers.
router.get('/', getAllCategories);

// These three were mounted with no middleware at all, which made them the only
// mutating endpoints in the whole API reachable by an anonymous caller —
// anyone could create categories and permanently delete existing ones, and
// deleting a category that products still reference breaks the catalogue.
// createCategory also ran Category.create(req.body), so the whole request body
// went straight into the document.
router.post('/', protect, restrictTo('admin'), validate(createCategorySchema), createCategory);
router.patch('/:id', protect, restrictTo('admin'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

export default router;