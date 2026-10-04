import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import Category from './modules/catalog/category.model.js';
import Product from './modules/catalog/product.model.js';
import DeliveryZone from './modules/orders/deliveryZone.model.js';

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPrice(minNaira, maxNaira) {
    const naira = Math.floor(Math.random() * (maxNaira - minNaira) + minNaira);
    return Math.round(naira / 500) * 500 * 100;
}

const sneakerNames = [
    'Air Runner', 'Court Classic', 'Trail Boot', 'Canvas Sneaker', 'Street Glide',
    'Vapor Max', 'Urban Flex', 'Sky Walker', 'Night Runner', 'Retro Court',
];
const sneakerBrands = ['TechU Sport', 'TechU Outdoor', 'TechU Racing', 'Urban Step'];
const sneakerSizes = ['39', '40', '41', '42', '43', '44'];
const sneakerColors = ['Black', 'White', 'Red', 'Blue', 'Grey'];

const sneakerImages = [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800',
    'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800',
    'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800',
    'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800',
    'https://images.unsplash.com/photo-1465453869711-7e174808ace9?w=800',
];

const clothingNames = [
    'Street Hoodie', 'Denim Jacket', 'Graphic Tee', 'Cargo Pants', 'Bomber Jacket',
    'Joggers', 'Puffer Vest', 'Crew Sweater', 'Flannel Shirt', 'Track Jacket',
];
const clothingBrands = ['TechU Basics', 'TechU Denim', 'TechU Active'];
const clothingSizes = ['S', 'M', 'L', 'XL'];
const clothingColors = ['Black', 'White', 'Grey', 'Khaki', 'Navy'];

const clothingImages = [
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
    'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
    'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=800',
    'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
    'https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=800',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
    'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800',
    'https://images.unsplash.com/photo-1584865288642-42078afe6942?w=800',
];

/** Generates 2-4 unique size/color variants for one product. */
function generateVariants(sizes, colors, skuPrefix) {
    const count = 2 + Math.floor(Math.random() * 3);
    const usedCombos = new Set();
    const variants = [];

    while (variants.length < count && usedCombos.size < sizes.length * colors.length) {
        const size = randomFrom(sizes);
        const color = randomFrom(colors);
        const comboKey = `${size}-${color}`;
        if (usedCombos.has(comboKey)) continue;

        usedCombos.add(comboKey);
        variants.push({
            size,
            color,
            sku: `${skuPrefix}-${size}-${color.slice(0, 3).toUpperCase()}`,
            stock: Math.floor(Math.random() * 12),
        });
    }
    return variants;
}

function buildProducts(names, brands, sizes, colors, category, count, priceRange, skuPrefix, imagePool) {
    const products = [];
    for (let i = 1; i <= count; i++) {
        const baseName = randomFrom(names);
        const name = `${baseName} ${i}`;
        const img1 = imagePool[i % imagePool.length];
        const img2 = imagePool[(i + 1) % imagePool.length];

        products.push({
            name,
            slug: slugify(name),
            brand: randomFrom(brands),
            description: `${baseName} — comfortable, durable, and built for everyday wear. True to size.`,
            priceFrom: randomPrice(priceRange[0], priceRange[1]),
            images: [img1, img2],
            category: category._id,
            variants: generateVariants(sizes, colors, `${skuPrefix}${i}`),
            rating: {
                average: Number((3.5 + Math.random() * 1.5).toFixed(1)),
                count: Math.floor(Math.random() * 250),
            },
        });
    }
    return products;
}

async function seed() {
    await mongoose.connect(env.mongoUri);
    console.info('Connected — clearing old data...');

    await Product.deleteMany({});

    await DeliveryZone.deleteMany({});
    await DeliveryZone.insertMany([
        { name: 'Lagos Mainland', fee: 250000, etaDays: '1-2', codAllowed: true },
        { name: 'Lagos Island', fee: 300000, etaDays: '1-2', codAllowed: true },
        { name: 'Abuja', fee: 450000, etaDays: '2-4', codAllowed: false },
        { name: 'Other states', fee: 550000, etaDays: '3-5', codAllowed: false },
    ]);
    console.info('Seeded delivery zones.');

    let sneakerCat = await Category.findOne({ slug: 'sneakers' });
    if (!sneakerCat) sneakerCat = await Category.create({ name: 'Sneakers', slug: 'sneakers' });

    let clothingCat = await Category.findOne({ slug: 'clothing' });
    if (!clothingCat) clothingCat = await Category.create({ name: 'Clothing', slug: 'clothing' });

    const sneakerProducts = buildProducts(
        sneakerNames, sneakerBrands, sneakerSizes, sneakerColors,
        sneakerCat, 40, [25000, 65000], 'SNK', sneakerImages,
    );
    const clothingProducts = buildProducts(
        clothingNames, clothingBrands, clothingSizes, clothingColors,
        clothingCat, 40, [12000, 35000], 'CLO', clothingImages,
    );

    console.info('Inserting new products...');
    await Product.insertMany([...sneakerProducts, ...clothingProducts]);
    console.info(`Seeded ${sneakerProducts.length + clothingProducts.length} products.`);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});