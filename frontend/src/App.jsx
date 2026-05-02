import { Suspense, lazy, useState, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import LoginPopup from './components/LoginPopup/LoginPopup';
import FoodChat from './components/FoodChat/FoodChat';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import { NotificationProvider } from './Context/NotificationContext';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from "./StripeProvider.jsx";
import { useTheme } from './Context/ThemeContext';
import './i18n.mjs';

// ── Page skeleton ─────────────────────────────────────────────────────────────
const PageSkeleton = () => (
  <div style={{ padding: "80px 40px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 900, margin: "0 auto" }}>
    {[120, 60, 200, 100].map((h, i) => (
      <div key={i} style={{ height: h, borderRadius: 16, background: "#f1f5f9", animation: "fe-pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
    ))}
    <style>{`@keyframes fe-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
  </div>
);

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Home                  = lazy(() => import('./pages/Home/Home'));
const Cart                  = lazy(() => import('./pages/Cart/Cart'));
const PlaceOrder            = lazy(() => import('./pages/PlaceOrder/PlaceOrder'));
const MyOrders              = lazy(() => import('./pages/MyOrders/MyOrders'));
const OrderTracking         = lazy(() => import('./pages/OrderTracking/OrderTracking'));
const SharedDeliveryWaiting = lazy(() => import('./pages/SharedDeliveryWaiting/SharedDeliveryWaiting'));
const Verify                = lazy(() => import('./pages/Verify/Verify'));
const Restaurants           = lazy(() => import('./pages/Restaurants/Restaurants'));
const RestaurantMenu        = lazy(() => import('./pages/RestaurantMenu/RestaurantMenu'));
const ResetPassword         = lazy(() => import('./pages/ResetPassword/ResetPassword'));
const PaymentMethods        = lazy(() => import('./pages/PaymentMethods/PaymentMethods'));
const Addresses             = lazy(() => import('./pages/Addresses/Addresses'));
const Favourites            = lazy(() => import('./pages/Favourites/Favourites'));
const Language              = lazy(() => import('./pages/Language/Language'));
const Settings              = lazy(() => import('./pages/Settings/Settings'));
const Profile               = lazy(() => import('./pages/Profile/Profile'));
const Wallet                = lazy(() => import('./pages/Wallet/Wallet'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const App = () => {
  const [showLogin, setShowLogin] = useState(false);
  const { i18n } = useTranslation();
  const { dark } = useTheme();

  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = i18n.language;
    document.body.classList.toggle("is-rtl", i18n.language === "ar");
  }, [i18n.language]);

  const appFont = i18n.language === "ar" ? "'Cairo', sans-serif" : "'DM Sans', sans-serif";

  return (
    <Elements stripe={stripePromise}>
      <NotificationProvider>
        <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable theme={dark ? "dark" : "light"} toastStyle={{ fontFamily: appFont, fontWeight: 600, fontSize: 14 }} style={{ zIndex: 99999, fontFamily: appFont }} />
        <ScrollToTop />
        {showLogin && <LoginPopup setShowLogin={setShowLogin} />}
        <div className='app'>
          <Navbar setShowLogin={setShowLogin} />
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path='/'                              element={<Home />} />
                <Route path='/cart'                         element={<div className="app-container"><Cart /></div>} />
                <Route path='/order'                        element={<div className="app-container"><PlaceOrder /></div>} />
                <Route path='/myorders'                     element={<div className="app-container"><MyOrders /></div>} />
                <Route path='/order/track/:orderId'         element={<div className="app-container"><OrderTracking /></div>} />
                <Route path='/order/shared-waiting/:orderId' element={<div className="app-container"><SharedDeliveryWaiting /></div>} />
                <Route path='/verify'                       element={<div className="app-container"><Verify /></div>} />
                <Route path='/restaurants'                  element={<div className="app-container"><Restaurants /></div>} />
                <Route path='/restaurants/:id'              element={<div className="app-container"><RestaurantMenu /></div>} />
                <Route path='/reset-password'               element={<div className="app-container"><ResetPassword /></div>} />
                <Route path='/payment-methods'              element={<div className="app-container"><PaymentMethods /></div>} />
                <Route path='/addresses'                    element={<div className="app-container"><Addresses /></div>} />
                <Route path='/favourites'                   element={<div className="app-container"><Favourites /></div>} />
                <Route path='/language'                     element={<div className="app-container"><Language /></div>} />
                <Route path='/settings'                     element={<div className="app-container"><Settings /></div>} />
                <Route path='/profile'                      element={<div className="app-container"><Profile /></div>} />
                <Route path='/wallet'                       element={<div className="app-container"><Wallet /></div>} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
        <Footer />
        <FoodChat />
      </NotificationProvider>
    </Elements>
  );
};

export default App;