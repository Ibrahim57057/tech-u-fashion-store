import { useState } from "react";
import { WishlistContext } from "./WishlistContext.js";

export function WishlistProvider({ children }) {
  const [productIds, setProductIds] = useState([]);

  function toggle(productId) {
    setProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  }

  function isWishlisted(productId) {
    return productIds.includes(productId);
  }

  return (
    <WishlistContext.Provider value={{ productIds, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}
