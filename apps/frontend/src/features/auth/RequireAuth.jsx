import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

/**
 * Gates the pages that complete a purchase.
 *
 * Browsing the catalogue, a product page and the cart all stay open to
 * anyone - a customer should be able to look before deciding. Placing the
 * order is different: it needs an account so the order has an owner who can
 * track it, return it and pay for it.
 *
 * The attempted path is passed along as ?from= so login can send the customer
 * straight back to checkout, with their cart still in localStorage, instead
 * of dumping them on the account page.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While /auth/me is in flight we must not redirect: bouncing to the login
  // page here would log out customers who are merely refreshing.
  if (isLoading) return null;

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />;
  }

  return children;
}