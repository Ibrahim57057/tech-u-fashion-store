import { NavLink } from "react-router-dom";
import { Home, Grid, ShoppingCart, User } from "lucide-react";
import { useCart } from "../hooks/useCart.js";

const navItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Shop", to: "/products", icon: Grid },
  { label: "Cart", to: "/cart", icon: ShoppingCart },
  { label: "Account", to: "/login", icon: User },
];

export default function BottomNav() {
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <nav className='md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200 flex justify-around py-2'>
      {navItems.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-xs relative ${
              isActive ? "text-brand-accent" : "text-neutral-500"
            }`
          }>
          <Icon className='w-5 h-5' />
          {label}
          {label === "Cart" && cartCount > 0 && (
            <span className='absolute -top-0.5 right-1 bg-brand-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center'>
              {cartCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
