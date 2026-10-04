export const mockProducts = [
    {
        id: 'p1',
        slug: 'air-runner',
        name: 'Air Runner',
        brand: 'TechU Sport',
        priceFrom: 4500000,
        images: [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
            'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800',
        ],
        category: 'sneakers',
        subcategory: 'running',
        variants: [
            { id: 'v1', size: '40', color: 'Black', stock: 5 },
            { id: 'v2', size: '41', color: 'Black', stock: 0 },
            { id: 'v3', size: '42', color: 'White', stock: 3 },
        ],
        badge: { variant: 'success', label: 'In stock' },
        rating: { average: 4.5, count: 128 },
    },
    {
        id: 'p2',
        slug: 'street-hoodie',
        name: 'Street Hoodie',
        brand: 'TechU Basics',
        priceFrom: 2200000,
        images: [
            'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
            'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800',
            'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=800',
        ],
        category: 'clothing',
        subcategory: 'hoodies',
        variants: [
            { id: 'v4', size: 'M', color: 'Grey', stock: 2 },
            { id: 'v5', size: 'L', color: 'Grey', stock: 0 },
        ],
        badge: { variant: 'warning', label: 'Low stock' },
        rating: { average: 4.2, count: 89 }
    },
    {
        id: 'p3',
        slug: 'court-classic',
        name: 'Court Classic',
        brand: 'TechU Sport',
        priceFrom: 3800000,
        images: [
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
            'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
        ],
        category: 'sneakers',
        subcategory: 'basketball',
        variants: [{ id: 'v6', size: '43', color: 'White', stock: 8 }],
        badge: { variant: 'neutral', label: 'New' },
        rating: { average: 4.8, count: 210 }
    },
    {
        id: 'p4',
        slug: 'denim-jacket',
        name: 'Denim Jacket',
        brand: 'TechU Basics',
        priceFrom: 3200000,
        images: [
            'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=800',
            'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
            'https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=800',
        ],
        category: 'clothing',
        subcategory: 'jackets',
        variants: [
            { id: 'v7', size: 'M', color: 'Blue', stock: 4 },
            { id: 'v8', size: 'L', color: 'Blue', stock: 6 },
        ],
        badge: { variant: 'neutral', label: 'New' },
        rating: { average: 4.5, count: 128 }
    },
    {
        id: 'p5',
        slug: 'trail-boot',
        name: 'Trail Boot',
        brand: 'TechU Outdoor',
        priceFrom: 5200000,
        images: [
            'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800',
            'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800',
            'https://images.unsplash.com/photo-1520256862855-398228c41684?w=800',
        ],
        category: 'sneakers',
        subcategory: 'boots',
        variants: [{ id: 'v9', size: '44', color: 'Brown', stock: 3 }],
        badge: { variant: 'success', label: 'In stock' },
        rating: { average: 3.9, count: 34 }
    },
    {
        id: 'p6',
        slug: 'graphic-tee',
        name: 'Graphic Tee',
        brand: 'TechU Basics',
        priceFrom: 1200000,
        images: [
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
            'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
            'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800',
        ],
        category: 'clothing',
        subcategory: 't-shirts',
        variants: [
            { id: 'v10', size: 'S', color: 'White', stock: 10 },
            { id: 'v11', size: 'M', color: 'White', stock: 0 },
        ],
        badge: { variant: 'warning', label: 'Low stock' },
        rating: { average: 3.9, count: 34 }

    },
    {
        id: 'p7',
        slug: 'canvas-sneaker',
        name: 'Canvas Sneaker',
        brand: 'TechU Sport',
        priceFrom: 2800000,
        images: [
            'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800',
            'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800',
            'https://images.unsplash.com/photo-1465453869711-7e174808ace9?w=800',
        ],
        category: 'sneakers',
        subcategory: 'casual',
        variants: [{ id: 'v12', size: '41', color: 'Red', stock: 7 }],
        badge: { variant: 'neutral', label: 'New' },
        rating: { average: 4.2, count: 89 }
    },
    {
        id: 'p8',
        slug: 'cargo-pants',
        name: 'Cargo Pants',
        brand: 'TechU Basics',
        priceFrom: 2600000,
        images: [
            'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800',
            'https://images.unsplash.com/photo-1584865288642-42078afe6942?w=800',
            'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800',
        ],
        category: 'clothing',
        subcategory: 'pants',
        variants: [
            { id: 'v13', size: 'M', color: 'Khaki', stock: 5 },
            { id: 'v14', size: 'L', color: 'Khaki', stock: 2 },
        ],
        badge: { variant: 'success', label: 'In stock' },
        rating: { average: 4.5, count: 128 }
    },
];

export function findProductBySlug(slug) {
    return mockProducts.find((p) => p.slug === slug) || null;
}
