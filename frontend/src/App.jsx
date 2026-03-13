import React, { useState } from 'react'
import Home from './pages/Home/Home'
import Footer from './components/Footer/Footer'
import Navbar from './components/Navbar/Navbar'
import { Route, Routes } from 'react-router-dom'
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
import OrderTracking from './pages/OrderTracking/OrderTracking'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
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
      {showLogin ? <LoginPopup setShowLogin={setShowLogin} /> : <></>}
      <div className='app'>
        <Navbar setShowLogin={setShowLogin} />
        <ErrorBoundary>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/cart' element={<Cart />} />
            <Route path='/order' element={<PlaceOrder />} />
            <Route path='/myorders' element={<MyOrders />} />
            <Route path='/verify' element={<Verify />} />
            <Route path='/restaurants' element={<Restaurants />} />
            <Route path='/restaurants/:id' element={<RestaurantMenu />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/order/track/:orderId' element={<OrderTracking />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <Footer />
    </>
  )
}

export default App