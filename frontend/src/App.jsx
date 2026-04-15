import React, { useState, useEffect } from 'react'
import Home from './pages/Home/Home'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Cart from './pages/Cart/Cart'
import LoginPopup from './components/LoginPopup/LoginPopup'
import PlaceOrder from './pages/PlaceOrder/PlaceOrder'
import MyOrders from './pages/MyOrders/MyOrders'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Verify from './pages/Verify/Verify'
import Restaurants from './pages/Restaurants/Restaurants'
import RestaurantMenu from './pages/RestaurantMenu/RestaurantMenu'
import ResetPassword from './pages/ResetPassword/ResetPassword'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import OrderTracking from './pages/OrderTracking/OrderTracking'
import { NotificationProvider } from './Context/NotificationContext'
import PaymentMethods from './pages/PaymentMethods/PaymentMethods';
import Addresses from './pages/Addresses/Addresses';
import Favourites from './pages/Favourites/Favourites';
import Language from './pages/Language/Language';
import Settings from './pages/Settings/Settings';
import Profile from './pages/Profile/Profile';
import FoodChat from './components/FoodChat/FoodChat';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from "./StripeProvider.jsx";
import { useTheme } from './Context/ThemeContext';
import './i18n.mjs';

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
    // Keep layout LTR even in Arabic as per user request
    document.documentElement.dir = "ltr";
    document.documentElement.lang = i18n.language;
    document.body.classList.toggle("is-rtl", i18n.language === "ar");
  }, [i18n.language]);

  const appFont = i18n.language === "ar" ? "'Cairo', sans-serif" : "'DM Sans', sans-serif";

  return (
    <Elements stripe={stripePromise}>
    <NotificationProvider>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme={dark ? "dark" : "light"}
        toastStyle={{ fontFamily: appFont, fontWeight: 600, fontSize: 14 }}
        style={{ zIndex: 99999, fontFamily: appFont }}
      />
      <ScrollToTop />
      {showLogin ? <LoginPopup setShowLogin={setShowLogin} /> : <></>}
      <div className='app'>
        <Navbar setShowLogin={setShowLogin} />
        <ErrorBoundary>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/cart' element={<div className="app-container"><Cart /></div>} />
            <Route path='/order' element={<div className="app-container"><PlaceOrder /></div>} />
            <Route path='/myorders' element={<div className="app-container"><MyOrders /></div>} />
            <Route path='/order/track/:orderId' element={<div className="app-container"><OrderTracking /></div>} />
            <Route path='/verify' element={<div className="app-container"><Verify /></div>} />
            <Route path='/restaurants' element={<div className="app-container"><Restaurants /></div>} />
            <Route path='/restaurants/:id' element={<div className="app-container"><RestaurantMenu /></div>} />
            <Route path='/reset-password' element={<div className="app-container"><ResetPassword /></div>} />
            <Route path='/payment-methods' element={<div className="app-container"><PaymentMethods /></div>} />
            <Route path='/addresses' element={<div className="app-container"><Addresses /></div>} />
            <Route path='/favourites' element={<div className="app-container"><Favourites /></div>} />
            <Route path='/language' element={<div className="app-container"><Language /></div>} />
            <Route path='/settings' element={<div className="app-container"><Settings /></div>} />
            <Route path='/profile' element={<div className="app-container"><Profile /></div>} />
          </Routes>
        </ErrorBoundary>
      </div>
      <Footer />
      <FoodChat />
    </NotificationProvider>
    </Elements>
  )
}

export default App