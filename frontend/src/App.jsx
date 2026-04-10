import React, { useState, useEffect } from 'react'
import Home from './pages/Home/Home'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
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
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from "./StripeProvider.jsx";
import './i18n.mjs';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

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
        theme="light"
        toastStyle={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 14 }}
        style={{ zIndex: 99999 }}
      />
      <ScrollToTop />
      {showLogin ? <LoginPopup setShowLogin={setShowLogin} /> : <></>}
      <div className='app'>
        <Navbar setShowLogin={setShowLogin} />
        <ErrorBoundary>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/cart' element={<Cart />} />
            <Route path='/order' element={<PlaceOrder />} />
            <Route path='/myorders' element={<MyOrders />} />
            <Route path='/order/track/:orderId' element={<OrderTracking />} />
            <Route path='/verify' element={<Verify />} />
            <Route path='/restaurants' element={<Restaurants />} />
            <Route path='/restaurants/:id' element={<RestaurantMenu />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/payment-methods' element={<PaymentMethods />} />
            <Route path='/addresses' element={<Addresses />} />
            <Route path='/favourites' element={<Favourites />} />
            <Route path='/language' element={<Language />} />
            <Route path='/settings' element={<Settings />} />
            <Route path='/profile' element={<Profile />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <Footer />
    </NotificationProvider>
    </Elements>
  )
}

export default App