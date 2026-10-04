import mongoose from 'mongoose';

import Wishlist from './wishlist.model.js';
import Product from '../catalog/product.model.js';
import { catchAsync } from '../../middleware/catchAsync.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Finds this user's wishlist, or creates an empty one the first time
 * they touch it. Every handler below calls this first, so the "does
 * one exist yet" check lives in one place.
 */
async function getOrCreate(userId) {
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) wishlist = await Wishlist.create({ user: userId, products: [] });
    return wishlist;
}

export const getWishlist = catchAsync(async (req, res) => {
    const wishlist = await getOrCreate(req.user._id);
    await wishlist.populate('products');
    res.json({ success: true, data: wishlist.products });
});

/** POST /api/v1/wishlist/:productId — toggles a product on or off. */
export const toggleWishlistItem = catchAsync(async (req, res, next) => {
    const wishlist = await getOrCreate(req.user._id);
    const { productId } = req.params;

    // Checked here rather than left to Mongoose so the caller gets a 404 for
    // a product that does not exist, instead of a wishlist row pointing at
    // nothing that later renders as a broken card. A malformed id would
    // otherwise surface as a CastError on save.
    if (!mongoose.isValidObjectId(productId)) {
        return next(new AppError('Product not found', 404));
    }

    const product = await Product.findById(productId).select('_id');
    if (!product) {
        return next(new AppError('Product not found', 404));
    }

    const exists = wishlist.products.some((id) => id.equals(productId));
    if (exists) {
        wishlist.products = wishlist.products.filter((id) => !id.equals(productId));
    } else {
        wishlist.products.push(productId);
    }

    await wishlist.save();
    res.json({ success: true, data: { productIds: wishlist.products } });
});