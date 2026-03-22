import React, { useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import './MyOrders.css';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';
import OrderInsights from '../../components/OrderInsights/OrderInsights';

const STATUS_STEPS = ['Order Placed', 'Food Processing', 'Out for Delivery', 'Delivered'];

const statusIndex = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'food processing')  return 1;
  if (s === 'out for delivery') return 2;
  if (s === 'delivered')         return 3;
  return 0;
};

const POLL_INTERVAL = 10000; // 10 seconds

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { url, token, currency, food_list } = useContext(StoreContext);
  const navigate = useNavigate();
  const [fetchError, setFetchError] = useState(false);
  const [ratings, setRatings] = useState({});       // { foodId: score }
  const [ratingLoading, setRatingLoading] = useState({});

  // Pre-populate ratings state from food_list data so they survive refresh
  React.useEffect(() => {
    if (!food_list.length || !orders.length || !token) return;
    // decode userId from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;
      const preloaded = {};
      orders.forEach(order => {
        if ((order.status || '').toLowerCase().trim() !== 'delivered') return;
        (order.items || []).forEach(item => {
          const food = food_list.find(f => f._id === item._id);
          if (!food?.ratings) return;
          const existing = food.ratings.find(r => r.userId === String(userId));
          if (existing) preloaded[item._id] = existing.score;
        });
      });
      if (Object.keys(preloaded).length > 0) setRatings(preloaded);
    } catch {}
  }, [orders, food_list, token]);

  const submitRating = async (foodId, score) => {
    setRatingLoading(prev => ({ ...prev, [foodId]: true }));
    try {
      const res = await axios.post(url + '/api/food/rate', { foodId, score }, { headers: { token } });
      if (res.data.success) {
        setRatings(prev => ({ ...prev, [foodId]: score }));
      } else {
        alert(res.data.message);
      }
    } catch { alert('Could not submit rating. Please try again.'); }
    finally { setRatingLoading(prev => ({ ...prev, [foodId]: false })); }
  };
  const pollRef = useRef(null);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setFetchError(false);
      const res = await axios.post(url + '/api/order/userorders', {}, { headers: { token } });
      if (res.data.success) {
        setOrders(res.data.data || []);
      } else {
        setFetchError(true);
        if (!silent) toast.error(res.data.message || 'Failed to load orders');
      }
    } catch (err) {
      setFetchError(true);
      if (!silent) toast.error(err?.response?.data?.message || 'Could not connect to server. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchOrders();

    // Poll every 10s — stop if all orders are delivered
    pollRef.current = setInterval(() => {
      setOrders(prev => {
        const hasActive = prev.some(o => (o.status || '').toLowerCase().trim() !== 'delivered');
        if (!hasActive && prev.length > 0) {
          clearInterval(pollRef.current);
        }
        return prev;
      });
      fetchOrders(true);
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, [token]);

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
        <>
          <OrderInsights orders={orders} currency={currency} />
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
                  <div className='mo-card-actions'>
                    <button
                      className='mo-track-btn'
                      onClick={() => navigate(`/order/track/${order._id}`)}
                    >
                      🛵 Track Order
                    </button>
                  </div>
                  {isDelivered && (
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', marginTop: 12, background: 'var(--bg)', borderRadius: '0 0 16px 16px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', margin: '0 0 8px' }}>Rate your items</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, flex: 1 }}>{item.name}</span>
                            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                              {[1,2,3,4,5].map(star => {
                                const filled = (ratings[item._id] || 0) >= star;
                                return (
                                  <button
                                    key={star}
                                    disabled={ratingLoading[item._id]}
                                    onClick={() => submitRating(item._id, star)}
                                    style={{ background: 'none', border: 'none', cursor: ratingLoading[item._id] ? 'wait' : 'pointer', padding: '2px', lineHeight: 1, transition: 'transform 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24"
                                      fill={filled ? '#f59e0b' : 'none'}
                                      stroke={filled ? '#f59e0b' : '#d1d5db'}
                                      strokeWidth="1.5">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                  </button>
                                );
                              })}
                              {ratings[item._id] && (
                                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, marginLeft: 4 }}>
                                  {ratings[item._id]}/5
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MyOrders;