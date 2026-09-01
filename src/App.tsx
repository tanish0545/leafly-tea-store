import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";

import Navbar from "./components/Navbar";
import CartDrawer from "./components/CartDrawer";
import WishlistDrawer from "./components/WishlistDrawer";
import ScrollToTop from "./components/ScrollToTop";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { OrderProvider } from "./context/OrderContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CouponProvider } from "./context/CouponContext";
import { TeawareProvider } from "./context/TeawareContext";
import { GiftingProvider } from "./context/GiftingContext";
import { ProductProvider } from "./context/ProductContext";

/* Route-level code splitting — each page is a separate JS chunk.
   Only the Home bundle ships on initial page load. */

import AdminRoute from "./components/AdminRoute";

const About = lazy(() => import("./pages/About"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Contact = lazy(() => import("./pages/Contact"));
const GiftingPage = lazy(() => import("./pages/GiftingPage"));
const Home = lazy(() => import("./pages/Home"));
const Journal = lazy(() => import("./pages/Journal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Orders = lazy(() => import("./pages/Orders"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Shop = lazy(() => import("./pages/Shop"));
const Teaware = lazy(() => import("./pages/Teaware"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const FreshnessGuarantee = lazy(() => import("./pages/FreshnessGuarantee"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const FAQs = lazy(() => import("./pages/FAQs"));
const TeaCollections = lazy(() => import("./pages/TeaCollections"));
const TeaMaker = lazy(() => import("./pages/TeaMaker"));
const WhyLeafly = lazy(() => import("./pages/WhyLeafly"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));

function CartRedirect() {
  const { openCart } = useCart();
  const navigate = useNavigate();
  useEffect(() => {
    openCart();
    navigate("/shop", { replace: true });
  }, [openCart, navigate]);
  return null;
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ProductProvider>
          <TeawareProvider>
            <GiftingProvider>
              <CartProvider>
                <WishlistProvider>
                  <OrderProvider>
                    <CouponProvider>
                      <BrowserRouter>
                      <ScrollToTop />
                      <Navbar />

                      <Suspense fallback={null}>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/shop" element={<Shop />} />
                          <Route path="/shop/:slug" element={<ProductDetail />} />
                          <Route path="/teaware" element={<Teaware />} />
                          <Route path="/teaware/:slug" element={<ProductDetail />} />
                          <Route path="/product/:id" element={<ProductDetail />} />
                          <Route path="/cart" element={<CartRedirect />} />
                          <Route path="/gifting" element={<GiftingPage />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/order-success" element={<OrderSuccess />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/tea-maker" element={<TeaMaker />} />
                          <Route path="/tea-collections" element={<TeaCollections />} />
                          <Route path="/why-leafly" element={<WhyLeafly />} />
                          <Route path="/journal" element={<Journal />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/signup" element={<Signup />} />
                          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                          <Route path="/privacy" element={<PrivacyPolicy />} />
                          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                          <Route path="/terms" element={<TermsAndConditions />} />
                          <Route path="/shipping-policy" element={<ShippingPolicy />} />
                          <Route path="/shipping" element={<ShippingPolicy />} />
                          <Route path="/freshness-guarantee" element={<FreshnessGuarantee />} />
                          <Route path="/freshness" element={<FreshnessGuarantee />} />
                          <Route path="/faqs" element={<FAQs />} />
                          <Route path="/faq" element={<FAQs />} />
                          <Route
                            path="/admin"
                            element={
                              <AdminRoute>
                                <AdminDashboard />
                              </AdminRoute>
                            }
                          />
                          <Route path="/admin/login" element={<AdminLogin />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>

                      <CartDrawer />
                      <WishlistDrawer />
                    </BrowserRouter>
                  </CouponProvider>
                </OrderProvider>
              </WishlistProvider>
            </CartProvider>
          </GiftingProvider>
        </TeawareProvider>
      </ProductProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;