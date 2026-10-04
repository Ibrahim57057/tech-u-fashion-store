import { useSyncExternalStore } from 'react';
import { getRatings, subscribe, rateProduct } from '../lib/reviews.js';

const EMPTY = {};

/**
 * The rating shown for a product is a weighted blend: the seeded figures
 * from the catalogue act as the prior, and every rating a visitor leaves
 * pulls the average towards what they actually thought. One 1-star
 * review on a 210-review product moves it slightly rather than
 * replacing it, which is how real review systems behave.
 */
export function useProductRating(product) {
    const ratings = useSyncExternalStore(subscribe, getRatings, () => EMPTY);

    const seedAverage = product?.rating?.average ?? 0;
    const seedCount = product?.rating?.count ?? 0;
    const myRating = (product && ratings[product.id]) || 0;

    const userRatings = Object.entries(ratings)
        .filter(([id]) => product && id === product.id)
        .map(([, value]) => value);

    const userTotal = userRatings.reduce((sum, value) => sum + value, 0);
    const totalCount = seedCount + userRatings.length;
    const average =
        totalCount === 0
            ? 0
            : (seedAverage * seedCount + userTotal) / totalCount;

    return {
        average,
        count: totalCount,
        myRating,
        rate: (value) => rateProduct(product.id, value),
    };
}
