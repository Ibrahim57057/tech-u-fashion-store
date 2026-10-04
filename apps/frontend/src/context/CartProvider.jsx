import { useState, useEffect, useCallback, useMemo } from "react";
import { CartContext } from "./CartContext.js";
import { useToast } from "../hooks/useToast.js";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("techu-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { showToast } = useToast();

  const addItem = useCallback((newItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === newItem.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === newItem.variantId
            ? { ...i, qty: i.qty + newItem.qty }
            : i,
        );
      }
      return [...prev, newItem];
    });
    setDrawerOpen(true);
    showToast(`${newItem.product.name} added to cart`);
  }, [showToast]);

  const removeItem = useCallback((variantId) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQty = useCallback((variantId, qty) => {
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    try {
      localStorage.setItem("techu-cart", JSON.stringify(items));
    } catch {
      // Storage can fail (private browsing, quota full) — the cart
      // still works in memory for the current session either way.
    }
  }, [items]);

  // Memoised because the provider sits above the whole app: without it every
  // cart change produced a new context value and re-rendered every consumer,
  // including ones that never read the cart.
  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
      drawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [items, addItem, removeItem, updateQty, clearCart, drawerOpen, openDrawer, closeDrawer],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
