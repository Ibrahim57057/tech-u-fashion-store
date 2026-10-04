import Category from './category.model.js';
import Product from './product.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';

// Only the two fields the UI actually renders.
const LIST_FIELDS = 'name slug';

// Only the fields the UI renders. `createdAt`/`__v` are noise on every row,
// and this is a public endpoint hit on every catalogue render.
//
// Deliberately NOT .lean(): the admin categories table keys rows on the `id`
// virtual produced by the schema's toJSON, and .lean() returns raw documents,
// which would make category.id undefined and break both the row key and the
// delete call.
export const getAllCategories = catchAsync(async (req, res) => {
    const categories = await Category.find().select(LIST_FIELDS).sort({ name: 1 });
    res.json({ success: true, data: categories });
});

export const createCategory = catchAsync(async (req, res) => {
    // req.body is the validated object: validate() replaced it with the Zod
    // result, so unknown keys (and any attempt at mass assignment) are gone.
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
});

export const updateCategory = catchAsync(async (req, res, next) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!category) return next(new AppError('Category not found', 404));
    res.json({ success: true, data: category });
});

export const deleteCategory = catchAsync(async (req, res, next) => {
    // Refuse while products still point at it. Deleting the row instead would
    // leave those products with a dangling reference that populate() silently
    // resolves to null, so they vanish from category listings with no way back.
    const inUse = await Product.countDocuments({ category: req.params.id });
    if (inUse > 0) {
        return next(
            new AppError(
                `Cannot delete: ${inUse} product${inUse === 1 ? '' : 's'} still use this category. Move them first.`,
                409,
            ),
        );
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return next(new AppError('Category not found', 404));

    res.status(204).json({ success: true, data: null });
});