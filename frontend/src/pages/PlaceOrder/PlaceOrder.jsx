import React, { useContext, useEffect, useState } from 'react';
import './PlaceOrder.css';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import SplitPayment from '../../components/SplitPayment/SplitPayment.jsx';

const PlaceOrder = () => {
  const [payment, setPayment] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ firstName: '', lastName: '', email: '', street: '', apartment: '', area: '', building: '', city: '', state: '', zipcode: '', country: '', phone: '', deliveryNotes: '' });
  const { getTotalCartAmount, token, food_list, foodListLoading, cartItems, url, setCartItems, currency, deliveryCharge } = useContext(StoreContext);
  const navigate = useNavigate();
  const subtotal = getTotalCartAmount();

  const onChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const placeOrder = async (e) => {
    e.preventDefault();
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
        else toast.error(res.data.message || 'Something went wrong');
      } else {
        const res = await axios.post(url + '/api/order/placecod', orderData, { headers: { token } });
        if (res.data.success) { toast.success('Order placed successfully!'); setCartItems({}); navigate('/myorders'); }
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
            <button className='po-submit' type='submit' disabled={loading}>
              {loading ? 'Placing Order...' : payment === 'cod' ? 'Place Order' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PlaceOrder;