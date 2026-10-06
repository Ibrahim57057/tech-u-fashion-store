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
            className='w-full h-44 sm:h-56 object-cover transition-transform duration-300 hover:scale-110'
          />
        </div>
      </Link>
      <div className='p-4 flex flex-col gap-2'>
        {/* min-w-0 is what lets the truncate below actually work. Without
            it the flex child sizes to its content, the name never shrinks,
            and Card's overflow-hidden clips it instead. */}
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0 flex-1'>
            <p className='text-xs text-neutral-500 truncate'>{product.brand}</p>
            <Link to={`/products/${product.slug}`}>
              <h3 className='font-display font-semibold text-brand-dark line-clamp-2'>
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
          <Button size='sm' className='w-full mt-1 whitespace-nowrap'>
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
  // shrink-0 so the badge keeps its width while the name takes the rest;
  // otherwise both compress and the name breaks mid-word.
  return (
    <span className='shrink-0'>
      {totalStock === 0 && <Badge variant='danger'>Sold out</Badge>}
      {totalStock > 0 && totalStock <= 5 && (
        <Badge variant='warning'>Low stock</Badge>
      )}
      {totalStock > 5 && <Badge variant='success'>In stock</Badge>}
    </span>
  );
}