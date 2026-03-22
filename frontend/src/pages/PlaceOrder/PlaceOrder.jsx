import React, { useContext, useEffect, useState } from 'react';
import './PlaceOrder.css';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import SplitPayment from '../../components/SplitPayment/SplitPayment.jsx';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const PlaceOrder = () => {
  const [payment, setPayment] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [distanceWarning, setDistanceWarning] = useState('');
  const [data, setData] = useState(() => {
    const base = { firstName: '', lastName: '', email: '', street: '', apartment: '', area: '', building: '', city: '', state: '', zipcode: '', country: 'UAE', phone: '', deliveryNotes: '' };
    try {
      const saved = JSON.parse(localStorage.getItem('crave_location'));
      if (saved?.label) {
        const parts = saved.label.split(',').map(s => s.trim());
        return { ...base, area: parts[0] || '', city: parts[1] || parts[0] || '' };
      }
    } catch {}
    return base;
  });
  const { getTotalCartAmount, token, food_list, foodListLoading, cartItems, url, setCartItems, currency, deliveryCharge } = useContext(StoreContext);
  const navigate = useNavigate();
  const subtotal = getTotalCartAmount();

  const onChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Check distance against restaurant radius whenever address fields change
  useEffect(() => {
    const city = data.city || data.state || '';
    const area = data.area || '';
    if (!city && !area) { setDistanceWarning(''); return; }

    const timer = setTimeout(async () => {
      try {
        // Get the restaurant from cart
        const firstItem = Object.values(cartItems).find(e => e.quantity > 0);
        if (!firstItem) return;
        const food = food_list.find(f => f._id === firstItem.itemId);
        if (!food) return;
        const restaurant = food.restaurantId;
        if (!restaurant?.location?.lat || !restaurant?.deliveryRadius) return;

        const radius = restaurant.deliveryRadius;
        if (radius === 0) { setDistanceWarning(''); return; }

        // Geocode the customer address
        const res = await fetch(`${url}/api/geocode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: data }),
        });
        const geocoded = await res.json();
        if (!geocoded.success) return;

        const dist = haversine(
          restaurant.location.lat, restaurant.location.lng,
          geocoded.lat, geocoded.lon
        );

        if (dist > radius) {
          setDistanceWarning(`🚫 This restaurant only delivers within ${radius} km. Your address is ${dist.toFixed(1)} km away.`);
        } else {
          setDistanceWarning('');
        }
      } catch { setDistanceWarning(''); }
    }, 800); // debounce 800ms

    return () => clearTimeout(timer);
  }, [data.city, data.area, data.street, data.state]);

  const placeOrder = async (e) => {
    e.preventDefault();
    if (distanceWarning) {
      toast.error(distanceWarning, { autoClose: 6000 });
      return;
    }
    setLoading(true);
    let orderItems = [];
    // cartItems format: { key -> { itemId, quantity, selections, extraPrice } }
    for (const key in cartItems) {
      const entry = cartItems[key];
      if (entry.quantity > 0) {
        const food = food_list.find(f => f._id === entry.itemId);
        if (food) orderItems.push({ ...food, quantity: entry.quantity, selections: entry.selections || {}, extraPrice: entry.extraPrice || 0 });
      }
    }
    if (!orderItems.length) { toast.error('Cart is empty'); setLoading(false); return; }

    const getResId = (it) => it.restaurantId?._id || it.restaurantId || null;
    const restaurantId = getResId(orderItems[0]);
    if (!restaurantId) { toast.error('Restaurant info missing. Refresh and try again.'); setLoading(false); return; }
    if (orderItems.some(it => getResId(it) !== restaurantId)) { toast.error('You can only order from one restaurant at a time.'); setLoading(false); return; }

    const orderData = { address: data, items: orderItems, amount: subtotal + deliveryCharge, deliveryFee: deliveryCharge, restaurantId };

    try {
      if (payment === 'stripe') {
        const res = await axios.post(url + '/api/order/place', orderData, { headers: { token } });
        if (res.data.success) window.location.replace(res.data.session_url);
        else if (res.data.outOfRange) toast.error('🚫 ' + res.data.message, { autoClose: 6000 });
        else toast.error(res.data.message || 'Something went wrong');
      } else {
        const res = await axios.post(url + '/api/order/placecod', orderData, { headers: { token } });
        if (res.data.success) { toast.success('Order placed successfully!'); setCartItems({}); navigate('/myorders'); }
        else if (res.data.outOfRange) toast.error('🚫 ' + res.data.message, { autoClose: 6000 });
        else toast.error(res.data.message || 'Something went wrong');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Network error');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) { toast.error('Please sign in to place an order'); navigate('/cart'); }
    else if (!foodListLoading && subtotal === 0) navigate('/cart');
  }, [token, foodListLoading, subtotal]);

  return (
    <div className='po-page'>
      <div className='po-header'>
        <button className='po-back' onClick={() => navigate('/cart')}>← Back to Cart</button>
        <h1 className='po-title'>Checkout</h1>
      </div>

      <form onSubmit={placeOrder} className='po-layout'>
        <div className='po-left'>
          <div className='po-card'>
            <h3 className='po-card-title'><span className='po-step'>1</span> Delivery Details</h3>
            <div className='po-grid-2'>
              <div className='po-field'><label>First Name</label><input name='firstName' value={data.firstName} onChange={onChange} placeholder='John' required /></div>
              <div className='po-field'><label>Last Name</label><input name='lastName' value={data.lastName} onChange={onChange} placeholder='Doe' required /></div>
            </div>
            <div className='po-grid-2'>
              <div className='po-field'><label>Email Address</label><input name='email' type='email' value={data.email} onChange={onChange} placeholder='john@example.com' required /></div>
              <div className='po-field'><label>Phone Number</label><input name='phone' value={data.phone} onChange={onChange} placeholder='+971 50 000 0000' required /></div>
            </div>
            <div className='po-field'><label>Street Address</label><input name='street' value={data.street} onChange={onChange} placeholder='e.g. Al Nahda Street, Sheikh Zayed Road' required /></div>
            <div className='po-grid-2'>
              <div className='po-field'><label>Building / Villa Name</label><input name='building' value={data.building} onChange={onChange} placeholder='e.g. Al Reef Tower, Villa 12' /></div>
              <div className='po-field'><label>Apartment / Room No.</label><input name='apartment' value={data.apartment} onChange={onChange} placeholder='e.g. Apt 401, Floor 4' /></div>
            </div>
            <div className='po-grid-2'>
              <div className='po-field'><label>Area / Neighbourhood</label><input name='area' value={data.area} onChange={onChange} placeholder='e.g. Downtown, JBR, Deira' required /></div>
              <div className='po-field'><label>City</label><input name='city' value={data.city} onChange={onChange} placeholder='Dubai' required /></div>
            </div>
            <div className='po-grid-2'>
              <div className='po-field'><label>Country</label><input name='country' value={data.country} onChange={onChange} placeholder='UAE' required /></div>
              <div className='po-field'><label>Zip Code <span style={{fontWeight:400,color:'#9ca3af'}}>(optional)</span></label><input name='zipcode' value={data.zipcode} onChange={onChange} placeholder='00000' /></div>
            </div>
            <div className='po-field'>
              <label>Delivery Notes <span style={{fontWeight:400,color:'#9ca3af'}}>(optional)</span></label>
              <input name='deliveryNotes' value={data.deliveryNotes} onChange={onChange} placeholder='e.g. Ring doorbell, leave at door, call on arrival...' />
            </div>
          </div>

          <div className='po-card'>
            <h3 className='po-card-title'><span className='po-step'>2</span> Payment Method</h3>
            <div className='po-payment-opts'>
              <div className={`po-payment-opt ${payment === 'cod' ? 'po-pay-active' : ''}`} onClick={() => setPayment('cod')}>
                <div className='po-pay-radio'>{payment === 'cod' && <div className='po-pay-dot'/>}</div>
                <div className='po-pay-icon'>💵</div>
                <div><p className='po-pay-name'>Cash on Delivery</p><p className='po-pay-sub'>Pay when your order arrives</p></div>
              </div>
              <div className={`po-payment-opt ${payment === 'stripe' ? 'po-pay-active' : ''}`} onClick={() => setPayment('stripe')}>
                <div className='po-pay-radio'>{payment === 'stripe' && <div className='po-pay-dot'/>}</div>
                <div className='po-pay-icon'>💳</div>
                <div><p className='po-pay-name'>Credit / Debit Card</p><p className='po-pay-sub'>Secure payment via Stripe</p></div>
              </div>
              <div className={`po-payment-opt ${payment === 'split' ? 'po-pay-active' : ''}`} onClick={() => setPayment('split')}>
                <div className='po-pay-radio'>{payment === 'split' && <div className='po-pay-dot'/>}</div>
                <div className='po-pay-icon'>🧮</div>
                <div><p className='po-pay-name'>Split by Card</p><p className='po-pay-sub'>Multiple cards, custom amounts</p></div>
              </div>
            </div>
          </div>

          {payment === 'split' && (
            <SplitPayment
              total={subtotal + deliveryCharge}
              apiBaseUrl={url}
              currency={currency}
              onComplete={() => {
                toast.success('All split payments completed (test mode).');
              }}
            />
          )}
        </div>

        <div className='po-right'>
          <div className='po-card po-summary-card'>
            <h3 className='po-card-title'>Order Summary</h3>
            <div className='po-sum-rows'>
              <div className='po-sum-row'><span>Subtotal</span><span>{currency}{subtotal.toFixed(2)}</span></div>
              <div className='po-sum-row'><span>Delivery</span><span>{currency}{deliveryCharge}.00</span></div>
              <div className='po-sum-row po-sum-total'><span>Total</span><span>{currency}{(subtotal + deliveryCharge).toFixed(2)}</span></div>
            </div>
            {distanceWarning && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: '#fef2f2', border: '1.5px solid #fecaca',
                fontSize: 13, fontWeight: 700, color: '#dc2626', lineHeight: 1.5,
              }}>
                {distanceWarning}
              </div>
            )}
            <button className='po-submit' type='submit' disabled={loading || !!distanceWarning}
              style={distanceWarning ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
              {loading ? 'Placing Order...' : payment === 'cod' ? 'Place Order' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;