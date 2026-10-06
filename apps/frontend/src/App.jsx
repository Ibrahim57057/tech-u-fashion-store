import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import Header from "./layout/Header.jsx";
import Footer from "./layout/Footer.jsx";
import BackToTop from "./layout/BackToTop.jsx";
import CookieConsent from "./layout/CookieConsent.jsx";
import BottomNav from "./layout/BottomNav.jsx";
import CartDrawer from "./features/cart/CartDrawer.jsx";
import { Loader2 } from "lucide-react";

import HomePage from "./pages/HomePage.jsx";
import AdminRoute from "./features/admin/AdminRoute.jsx";
import RequireAuth from "./features/auth/RequireAuth.jsx";

// Everything below the home page is split out of the initial bundle. Before
// this, App.jsx imported all 30-odd pages eagerly, so a first-time visitor
// downloading the homepage also downloaded checkout, the account area and the
// whole admin section — which is where recharts and the product form live.
// Splitting drops the biggest chunk of that weight for anyone who is only
// browsing.
const ProductListingPage = lazy(() => import("./pages/ProductListingPage.jsx"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const AccountPage = lazy(() => import("./pages/AccountPage.jsx"));
const WishlistPage = lazy(() => import("./pages/WishlistPage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const PaymentCallbackPage = lazy(() => import("./pages/PaymentCallbackPage.jsx"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage.jsx"));
const DeliveryPage = lazy(() => import("./pages/DeliveryPage.jsx"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage.jsx"));
const TermsPage = lazy(() => import("./pages/TermsPage.jsx"));

// The admin area is lazily loaded as a unit, and AdminLayout with it, so
// charting code never reaches a customer who never visits /admin.
const AdminLayout = lazy(() => import("./layout/AdminLayout.jsx"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage.jsx"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage.jsx"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage.jsx"));
const AdminReturnsPage = lazy(() => import("./pages/admin/AdminReturnsPage.jsx"));
const AdminMessagesPage = lazy(() => import("./pages/admin/AdminMessagesPage.jsx"));
const AdminSubscribersPage = lazy(() => import("./pages/admin/AdminSubscribersPage.jsx"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage.jsx"));
const AdminProductFormPage = lazy(() => import("./pages/admin/AdminProductFormPage.jsx"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage.jsx"));
const AdminDeliveryZonesPage = lazy(() => import("./pages/admin/AdminDeliveryZonesPage.jsx"));

import { useIdleLogout } from "./hooks/useIdleLogout.js";

/**
 * Placeholder for a chunk that has not arrived yet. Matches the page shape
 * roughly so the layout does not jump when the real page renders.
 */
function RouteFallback() {
  return (
    <div className='flex items-center justify-center py-24' role='status' aria-live='polite'>
      <Loader2 className='w-8 h-8 text-brand-accent animate-spin' />
      <span className='sr-only'>Loading…</span>
    </div>
  );
}

export default function App() {
  useIdleLogout();
  const location = useLocation();

  return (
    <div className='pb-16 md:pb-0'>
      <Header />

      <AnimatePresence mode='wait'>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}>
          {/* One boundary for every route, so each lazy page does not need its
              own wrapper. Sits inside the animated div so the transition still
              covers the swap. */}
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location}>
              <Route path='/' element={<HomePage />} />
              <Route path='/products' element={<ProductListingPage />} />
              <Route path='/products/:slug' element={<ProductDetailPage />} />
              <Route path='/cart' element={<CartPage />} />
              {/* Browsing and the cart are public; completing a purchase is not. */}
              <Route
                path='/checkout'
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path='/order-confirmation'
                element={
                  <RequireAuth>
                    <OrderConfirmationPage />
                  </RequireAuth>
                }
              />
              <Route path='/login' element={<LoginPage />} />
              <Route path='/register' element={<RegisterPage />} />
              {/* Reached from the emailed link, so these must resolve on a
                  cold load with no SPA session — vercel.json rewrites them
                  to index.html for that reason. */}
              <Route path='/forgot-password' element={<ForgotPasswordPage />} />
              <Route path='/reset-password' element={<ResetPasswordPage />} />
              <Route path='/account' element={<AccountPage />} />
              <Route path='/wishlist' element={<WishlistPage />} />
              <Route path='/about' element={<AboutPage />} />
              <Route path='/contact' element={<ContactPage />} />
              <Route path='/returns' element={<ReturnsPage />} />
              <Route path='/delivery' element={<DeliveryPage />} />
              <Route path='/privacy' element={<PrivacyPage />} />
              <Route path='/terms' element={<TermsPage />} />
              <Route path='/payment/callback' element={<PaymentCallbackPage />} />
              <Route
                path='/admin'
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }>
                <Route index element={<AdminDashboardPage />} />
                <Route path='products' element={<AdminProductsPage />} />
                <Route path='orders' element={<AdminOrdersPage />} />
                <Route path='returns' element={<AdminReturnsPage />} />
                <Route path='messages' element={<AdminMessagesPage />} />
                <Route path='subscribers' element={<AdminSubscribersPage />} />

                <Route path='categories' element={<AdminCategoriesPage />} />
                <Route path='products/new' element={<AdminProductFormPage />} />
                <Route
                  path='products/:id/edit'
                  element={<AdminProductFormPage />}
                />
                <Route path='users' element={<AdminUsersPage />} />
                <Route
                  path='delivery-zones'
                  element={<AdminDeliveryZonesPage />}
                />
              </Route>
              <Route path='*' element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <Footer />
      <BackToTop />
      <CookieConsent />
      <BottomNav />
      <CartDrawer />
    </div>
  );
}