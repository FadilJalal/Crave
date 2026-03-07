import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './MyOrders.css';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';

const STATUS_STEPS = ['Order Placed', 'Food Processing', 'Out for Delivery', 'Delivered'];

// Normalise to lowercase to handle "Out for delivery" vs "Out for Delivery" etc.
const statusIndex = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'food processing')  return 1;
  if (s === 'out for delivery') return 2;
  if (s === 'delivered')        return 3;
  return 0;
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { url, token, currency } = useContext(StoreContext);
  const navigate = useNavigate();

  const [fetchError, setFetchError] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const res = await axios.post(url + '/api/order/userorders', {}, { headers: { token } });
      if (res.data.success) {
        setOrders(res.data.data || []);
      } else {
        setFetchError(true);
        toast.error(res.data.message || 'Failed to load orders');
      }
    } catch (err) {
      setFetchError(true);
      toast.error(err?.response?.data?.message || 'Could not connect to server. Please try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchOrders(); }, [token]);

  if (loading) return (
    <div className='mo-page'>
      <h1 className='mo-title'>My Orders</h1>
      <div className='mo-loading'>
        {[1,2,3].map(i => <div key={i} className='mo-skeleton skeleton'/>)}
      </div>
    </div>
  );

  if (fetchError) return (
    <div className='mo-page'>
      <h1 className='mo-title'>My Orders</h1>
      <div className='mo-empty'>
        <div className='mo-empty-icon'>⚠️</div>
        <p className='mo-empty-title'>Failed to load orders</p>
        <p className='mo-empty-sub'>There was a problem connecting to the server.</p>
        <button className='mo-order-btn' onClick={fetchOrders}>Try Again</button>
      </div>
    </div>
  );

  return (
    <div className='mo-page'>
      <div className='mo-header'>
        <h1 className='mo-title'>My Orders</h1>
        <button className='mo-refresh' onClick={fetchOrders}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className='mo-empty'>
          <div className='mo-empty-icon'>📦</div>
          <p className='mo-empty-title'>No orders yet</p>
          <p className='mo-empty-sub'>Your order history will appear here.</p>
          <button className='mo-order-btn' onClick={() => navigate('/')}>Start Ordering</button>
        </div>
      ) : (
        <div className='mo-list'>
          {[...orders].reverse().map((order, i) => {
            const step = statusIndex(order.status);
            const isDelivered = (order.status || '').toLowerCase().trim() === 'delivered';
            return (
              <div key={i} className='mo-card'>
                <div className='mo-card-top'>
                  <div className='mo-order-icon'>📦</div>
                  <div className='mo-order-info'>
                    <p className='mo-order-id'>Order #{String(order._id).slice(-6).toUpperCase()}</p>
                    <p className='mo-order-items'>
                      {(order.items || []).map((it, idx) =>
                        `${it.name} x${it.quantity}${idx < order.items.length - 1 ? ', ' : ''}`
                      )}
                    </p>
                  </div>
                  <div className='mo-order-right'>
                    <p className='mo-order-amount'>{currency}{order.amount}.00</p>
                    <span className={`mo-status-badge ${isDelivered ? 'mo-delivered' : 'mo-active'}`}>
                      {isDelivered ? '✓ Delivered' : '⏱ ' + (order.status || 'Processing')}
                    </span>
                  </div>
                </div>

                <div className='mo-progress'>
                  {STATUS_STEPS.map((s, idx) => (
                    <React.Fragment key={s}>
                      <div className='mo-prog-step'>
                        <div className={`mo-prog-dot ${idx <= step ? 'mo-prog-done' : ''} ${idx === step ? 'mo-prog-current' : ''}`}>
                          {idx <= step ? '✓' : idx + 1}
                        </div>
                        <p className={`mo-prog-label ${idx <= step ? 'mo-prog-label-done' : ''}`}>{s}</p>
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`mo-prog-line ${idx < step ? 'mo-prog-line-done' : ''}`}/>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;