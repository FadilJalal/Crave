// frontend/src/pages/Cart/Cart.jsx
import React, { useContext } from 'react';
import { toast } from 'react-toastify';
import './Cart.css';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';

const Cart = () => {
  const { cartItems, food_list, foodListLoading, removeFromCart, addToCart, getTotalCartAmount, url, currency, deliveryCharge, token } = useContext(StoreContext);
  const navigate = useNavigate();

  // Build cart rows - fallback to localStorage cache if food_list not ready
  const resolvedFoodList = food_list.length > 0 ? food_list : (() => {
    try { return JSON.parse(localStorage.getItem("crave_food_cache") || "[]"); } catch { return []; }
  })();

  const cartRows = Object.entries(cartItems)
    .filter(([, entry]) => entry.quantity > 0)
    .map(([key, entry]) => {
      const food = resolvedFoodList.find(f => f._id === entry.itemId);
      if (!food) return null;
      return { key, food, entry };
    })
    .filter(Boolean);

  const subtotal = getTotalCartAmount();

  // Format selections as readable text: "Size: Large · Drink: Pepsi"
  const formatSelections = (selections = {}) => {
    return Object.entries(selections)
      .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(' · ');
  };

  return (
    <div className='cart-page'>
      <h1 className='cart-title'>Your Cart</h1>

      {foodListLoading ? (
        <div className='cart-empty'>
          <div className='cart-empty-icon'>⏳</div>
          <p className='cart-empty-title'>Loading your cart...</p>
        </div>
      ) : !foodListLoading && Object.keys(cartItems).length > 0 && cartRows.length === 0 ? (
        <div className='cart-empty'>
          <div className='cart-empty-icon'>⚠️</div>
          <p className='cart-empty-title'>Could not load cart items</p>
          <p className='cart-empty-sub'>Menu data failed to load. Please refresh the page.</p>
          <button className='cart-empty-btn' onClick={() => window.location.reload()}>Refresh</button>
        </div>
      ) : cartRows.length === 0 ? (
        <div className='cart-empty'>
          <div className='cart-empty-icon'>🛒</div>
          <p className='cart-empty-title'>Your cart is empty</p>
          <p className='cart-empty-sub'>Add some delicious items to get started!</p>
          <button className='cart-empty-btn' onClick={() => navigate('/')}>Browse Menu</button>
        </div>
      ) : (
        <div className='cart-layout'>
          <div className='cart-items-section'>
            <div className='cart-items-header'>
              <span>{cartRows.length} item{cartRows.length !== 1 ? 's' : ''} in your cart</span>
            </div>

            {cartRows.map(({ key, food, entry }) => {
              const itemTotal = (food.price + (entry.extraPrice || 0)) * entry.quantity;
              const selText = formatSelections(entry.selections);

              return (
                <div key={key} className='cart-row'>
                  <img
                    src={url + '/images/' + food.image}
                    alt={food.name}
                    className='cart-row-img'
                    onError={e => e.target.src = 'https://via.placeholder.com/80'}
                  />
                  <div className='cart-row-info'>
                    <p className='cart-row-name'>{food.name}</p>
                    {/* ✅ Show customizations below the name */}
                    {selText ? (
                      <p className='cart-row-customizations'>{selText}</p>
                    ) : (
                      <p className='cart-row-cat'>{food.category}</p>
                    )}
                    {/* ✅ Show per-item price if there's an extra charge */}
                    {entry.extraPrice > 0 && (
                      <p className='cart-row-unit-price'>
                        {currency}{food.price} + {currency}{entry.extraPrice} extra
                      </p>
                    )}
                  </div>

                  <div className='cart-row-ctrl'>
                    <button onClick={() => removeFromCart(key)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                    <span>{entry.quantity}</span>
                    <button onClick={() => addToCart(food._id, entry.selections)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>

                  {/* ✅ Shows correct price including extras */}
                  <p className='cart-row-price'>{currency}{itemTotal.toFixed(2)}</p>

                  <button className='cart-row-remove' onClick={() => {
                    // Remove all quantity of this specific variation
                    for (let i = 0; i < entry.quantity; i++) removeFromCart(key);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              );
            })}

            <div className='cart-promo'>
              <div className='cart-promo-input'>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <input type='text' placeholder='Enter promo code...' />
              </div>
              <button className='cart-promo-btn'>Apply</button>
            </div>
          </div>

          <div className='cart-summary'>
            <h3 className='cart-summary-title'>Order Summary</h3>
            <div className='cart-summary-rows'>
              <div className='cart-sum-row'><span>Subtotal</span><span>{currency}{subtotal.toFixed(2)}</span></div>
              <div className='cart-sum-row'><span>Delivery fee</span><span>{subtotal === 0 ? `${currency}0.00` : `${currency}${deliveryCharge}.00`}</span></div>
              <div className='cart-sum-row cart-sum-row-total'><span>Total</span><span>{currency}{subtotal === 0 ? '0.00' : (subtotal + deliveryCharge).toFixed(2)}</span></div>
            </div>
            <button className='cart-checkout-btn' onClick={() => {
                if (!token) { toast.error('Please sign in to checkout'); setShowLogin && setShowLogin(true); return; }
                navigate('/order');
              }}>
              Proceed to Checkout
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button className='cart-continue-btn' onClick={() => navigate('/')}>← Continue Shopping</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;