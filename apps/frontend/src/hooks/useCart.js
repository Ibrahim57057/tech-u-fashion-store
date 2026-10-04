import { useContext } from "react";
import { CartContext } from "../context/CartContext.js";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a <CartProvider>");
  return ctx;
}
