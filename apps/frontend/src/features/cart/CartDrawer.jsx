import { Link } from "react-router-dom";
import { useCart } from "../../hooks/useCart.js";
import Drawer from "../../components/ui/Drawer.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import CartItemRow from "./CartItemRow.jsx";
import PromoCodeField from "./PromoCodeField.jsx";
import { formatNaira } from "../../lib/formatNaira.js";

export default function CartDrawer() {
  const { items, removeItem, updateQty, total, drawerOpen, closeDrawer } =
    useCart();

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      side='right'
      title='Your cart'>
      {items.length === 0 ? (
        <EmptyState
          title='Your cart is empty'
          message="Add something you like and it'll show up here."
          actionLabel='Start shopping'
          actionTo='/products'
          onAction={closeDrawer}
        />
      ) : (
        <div className='flex flex-col h-full'>
          <div className='flex-1 overflow-y-auto px-4'>
            {items.map((item) => (
              <CartItemRow
                key={item.variantId}
                item={item}
                onRemove={removeItem}
                onQtyChange={updateQty}
              />
            ))}
          </div>

          <div className='border-t border-neutral-200 p-4 space-y-4'>
            <PromoCodeField />
            <div className='flex items-center justify-between font-display font-bold text-brand-dark'>
              <span>Total</span>
              <span>{formatNaira(total)}</span>
            </div>
            <Link to='/checkout' onClick={closeDrawer}>
              <Button className='w-full'>Proceed to checkout</Button>
            </Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}
