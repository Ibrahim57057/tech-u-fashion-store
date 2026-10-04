import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Heart, User, Search, Menu, Shield } from "lucide-react";
import { useCart } from "../hooks/useCart.js";
import { useWishlist } from "../hooks/useWishlist.js";
import { useAuth } from "../hooks/useAuth.js";
import { canAccessAdmin } from "../features/admin/permissions.js";
import Drawer from "../components/ui/Drawer.jsx";
import AnimatedLogo from "../components/ui/AnimatedLogo.jsx";
import logo from "../assets/tech-u-logo.png";
import { categories } from "../lib/mockCategories.js";
import MegaMenu from "./MegaMenu.jsx";
import SearchBar from "./SearchBar.jsx";

const navLinks = [
  { label: "Shop all", to: "/products" },
  { label: "Sneakers", to: "/products?category=sneakers" },
  { label: "Clothing", to: "/products?category=clothing" },
];

export default function Header() {
  const { items } = useCart();
  const { productIds } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const wishlistCount = productIds.length;

  // Sticky header that reacts to scroll: adds a shadow once the page
  // has scrolled past a small threshold. Same cleanup-function habit
  // as every other effect that subscribes to something external.
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 bg-white transition-shadow ${
        scrolled ? "shadow-md" : "border-b border-neutral-200"
      }`}>
      <div className='flex items-center justify-between px-4 md:px-6 py-4 max-w-7xl mx-auto'>
        {/* Mobile hamburger — hidden on desktop */}
        <button
          className='md:hidden p-1'
          onClick={() => setMobileOpen(true)}
          aria-label='Open menu'>
          <Menu className='w-6 h-6 text-brand-dark' />
        </button>

        <Link to='/' aria-label='TECH-U Fashion Store, home' className='block'>
          <AnimatedLogo
            src={logo}
            alt='TECH-U Fashion Store'
            className='h-8 md:h-9 w-auto'
          />
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <nav className='hidden md:flex gap-6 relative'>
          {navLinks.map((link) => {
            const matchingCategory = categories.find((c) =>
              link.to.includes(c.slug),
            );
            return (
              <div
                key={link.to}
                onMouseEnter={() =>
                  matchingCategory && setHoveredCategory(matchingCategory.id)
                }
                onMouseLeave={() => setHoveredCategory(null)}>
                <Link
                  to={link.to}
                  className='font-body text-sm text-brand-dark hover:text-brand-accent transition-colors'>
                  {link.label}
                </Link>
                {matchingCategory && (
                  <MegaMenu
                    category={matchingCategory}
                    open={hoveredCategory === matchingCategory.id}
                  />
                )}
              </div>
            );
          })}
        </nav>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label='Search'>
            <Search className='w-5 h-5 text-brand-dark' />
          </button>

          <Link
            to='/wishlist'
            className='relative hidden sm:block'
            aria-label='Wishlist'>
            <Heart className='w-5 h-5 text-brand-dark' />
            {wishlistCount > 0 && <CountBubble count={wishlistCount} />}
          </Link>

          {canAccessAdmin(user) && (
            <Link
              to='/admin'
              className='hidden sm:block'
              aria-label='Admin panel'>
              <Shield className='w-5 h-5 text-brand-accent2' />
            </Link>
          )}

          <Link
            to={isAuthenticated ? "/account" : "/login"}
            className='hidden sm:block'
            aria-label='Account'>
            <User className='w-5 h-5 text-brand-dark' />
          </Link>

          <Link to='/cart' className='relative' aria-label='Cart'>
            <ShoppingCart className='w-5 h-5 text-brand-dark' />
            {cartCount > 0 && <CountBubble count={cartCount} />}
          </Link>
        </div>
      </div>

      {/* Simple search bar row — toggled open, real autocomplete comes later */}
      {searchOpen && (
        <div className='px-4 md:px-6 pb-4 max-w-7xl mx-auto'>
          <SearchBar onNavigate={() => setSearchOpen(false)} />
        </div>
      )}
      {/* Mobile nav, built from the Drawer you already tested */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side='left'
        title='Menu'>
        <nav className='flex flex-col p-4 gap-4'>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className='font-body text-brand-dark'>
              {link.label}
            </Link>
          ))}
          {canAccessAdmin(user) && (
            <Link
              to='/admin'
              onClick={() => setMobileOpen(false)}
              className='font-body text-brand-dark'>
              Admin panel
            </Link>
          )}
          <Link
            to={isAuthenticated ? "/account" : "/login"}
            onClick={() => setMobileOpen(false)}
            className='font-body text-brand-dark'>
            Account
          </Link>
          <Link
            to='/wishlist'
            onClick={() => setMobileOpen(false)}
            className='font-body text-brand-dark'>
            Wishlist
          </Link>
        </nav>
      </Drawer>
    </header>
  );
}

/** Small internal helper — not exported, only used inside this file, so
 * it doesn't belong in components/ui/. Not every reusable-looking piece
 * needs its own file; this one is specific to Header's two icon badges. */
function CountBubble({ count }) {
  return (
    <span className='absolute -top-2 -right-2 bg-brand-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
      {count}
    </span>
  );
}
