import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import StarRating from "../../components/ui/StarRating.jsx";
import { formatNaira } from "../../lib/formatNaira.js";

export default function ProductCard({ product }) {
  return (
    <Card hoverable className='flex flex-col'>
      <Link to={`/products/${product.slug}`}>
        <div className='overflow-hidden'>
          <img
            src={product.images[0]}
            alt={product.name}
            className='w-full h-56 object-cover transition-transform duration-300 hover:scale-110'
          />
        </div>
      </Link>
      <div className='p-4 flex flex-col gap-2'>
        <div className='flex items-start justify-between'>
          <div>
            <p className='text-xs text-neutral-500'>{product.brand}</p>
            <Link to={`/products/${product.slug}`}>
              <h3 className='font-display font-semibold text-brand-dark'>
                {product.name}
              </h3>
            </Link>
            {product.rating?.count > 0 && (
              <StarRating
                average={product.rating.average}
                count={product.rating.count}
              />
            )}
          </div>
          <StockBadge variants={product.variants} />
        </div>
        <p className='font-body font-semibold text-brand-dark'>
          From {formatNaira(product.priceFrom)}
        </p>
        <Link to={`/products/${product.slug}`}>
          <Button size='sm' className='w-full mt-1'>
            <ShoppingCart className='w-4 h-4 mr-2' />
            View options
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function StockBadge({ variants }) {
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  if (totalStock === 0) return <Badge variant='danger'>Sold out</Badge>;
  if (totalStock <= 5) return <Badge variant='warning'>Low stock</Badge>;
  return <Badge variant='success'>In stock</Badge>;
}