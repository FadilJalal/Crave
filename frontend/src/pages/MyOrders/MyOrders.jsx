import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import './MyOrders.css';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';
import OrderInsights from '../../components/OrderInsights/OrderInsights';
import ReviewForm from '../../components/ReviewForm/ReviewForm';

const STATUS_STEPS = ['Order Placed', 'Food Processing', 'Out for Delivery', 'Delivered'];

const getOrderItemsSubtotal = (order) =>
  (order?.items || []).reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

const getOrderDisplayTotal = (order) => {
  const subtotal = getOrderItemsSubtotal(order);
  const deliveryFee = Number(order?.deliveryFee || 0);
  const discount = Number(order?.discount || 0);
  const computedTotal = Math.max(0, subtotal + deliveryFee - discount);

  if (order?.paymentMethod === 'split') return computedTotal;
  return Number.isFinite(Number(order?.amount)) ? Number(order.amount) : computedTotal;
};

const statusIndex = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'food processing')  return 1;
  if (s === 'out for delivery') return 2;
  if (s === 'delivered')         return 3;
  return 0;
};

const POLL_INTERVAL = 10000;

const DATE_FILTERS = [
  { label: 'All time', value: 'all' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
];

const isInDateRange = (dateStr, preset) => {
  if (preset === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === '7days') {
    const t = new Date(today);
    t.setDate(t.getDate() - 7);
    return d >= t;
  }

  if (preset === '30days') {
    const t = new Date(today);
    t.setDate(t.getDate() - 30);
    return d >= t;
  }

  return true;
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { url, token, currency } = useContext(StoreContext);
  const navigate = useNavigate();
  const [fetchError, setFetchError] = useState(false);
  const [cancelling, setCancelling] = useState({});
  const [cancelModal, setCancelModal] = useState(null);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = async (orderId) => {
    setCancelModal(orderId);
  };

  const confirmCancel = async (orderId) => {
    setCancelModal(null);
    setCancelling(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await axios.post(url + '/api/order/cancel', { orderId }, { headers: { token } });
      if (res.data.success) {
        toast.success(res.data.message, { autoClose: 8000 });
        fetchOrders(true);
      } else {
        toast.error(res.data.message || "Could not cancel order.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setCancelling(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const pollRef = useRef(null);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setFetchError(false);
      const res = await axios.post(url + '/api/order/userorders', {}, { headers: { token } });
      if (res.data.success) {
        const newOrders = res.data.data || [];
        setOrders(newOrders);
        if (newOrders.length > 0 && newOrders.every(o => (o.status || '').toLowerCase().trim() === 'delivered')) {
          clearInterval(pollRef.current);
        }
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
    pollRef.current = setInterval(() => fetchOrders(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [token]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...orders].filter((order) => {
      if (statusFilter !== 'all' && (order.status || '').toLowerCase().trim() !== statusFilter) return false;
      if (dateFilter !== 'all' && !isInDateRange(order.createdAt, dateFilter)) return false;

      if (!q) return true;

      const id = String(order._id || '').toLowerCase();
      const itemText = (order.items || []).map((it) => `${it.name || ''} ${it.quantity || ''}`).join(' ').toLowerCase();
      const statusText = String(order.status || '').toLowerCase();
      const restaurantText = String(order.restaurantId?.name || '').toLowerCase();

      return id.includes(q) || itemText.includes(q) || statusText.includes(q) || restaurantText.includes(q);
    });

    list.sort((a, b) => {
      const aDelivered = (a.status || '').toLowerCase().trim() === 'delivered';
      const bDelivered = (b.status || '').toLowerCase().trim() === 'delivered';
      if (aDelivered !== bDelivered) return aDelivered ? 1 : -1;

      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'highest') return getOrderDisplayTotal(b) - getOrderDisplayTotal(a);
      if (sortBy === 'lowest') return getOrderDisplayTotal(a) - getOrderDisplayTotal(b);
      return 0;
    });

    return list;
  }, [orders, search, statusFilter, dateFilter, sortBy]);

  const activeFilterCount = [search.trim(), statusFilter !== 'all', dateFilter !== 'all', sortBy !== 'newest'].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setSortBy('newest');
  };

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
        <div className='mo-header-actions'>
          {orders.length > 0 && (
            <span className='mo-count'>
              {filteredOrders.length} of {orders.length}
            </span>
          )}
          <button className='mo-refresh' onClick={fetchOrders}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className='mo-filters'>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search order id, item, restaurant, status...'
            className='mo-filter-input'
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className='mo-filter-select'>
            <option value='all'>All statuses</option>
            <option value='food processing'>Food Processing</option>
            <option value='out for delivery'>Out for Delivery</option>
            <option value='delivered'>Delivered</option>
            <option value='cancelled'>Cancelled</option>
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className='mo-filter-select'>
            {DATE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className='mo-filter-select'>
            <option value='newest'>Newest first</option>
            <option value='oldest'>Oldest first</option>
            <option value='highest'>Highest amount</option>
            <option value='lowest'>Lowest amount</option>
          </select>
          {activeFilterCount > 0 && (
            <button type='button' className='mo-clear-filters' onClick={clearFilters}>Clear</button>
          )}
        </div>
      )}

      {orders.length === 0 ? (
        <div className='mo-empty'>
          <div className='mo-empty-icon'>📦</div>
          <p className='mo-empty-title'>No orders yet</p>
          <p className='mo-empty-sub'>Your order history will appear here.</p>
          <button className='mo-order-btn' onClick={() => navigate('/')}>Start Ordering</button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className='mo-empty'>
          <div className='mo-empty-icon'>🔎</div>
          <p className='mo-empty-title'>No orders match your filters</p>
          <p className='mo-empty-sub'>Try changing search or filter options.</p>
          <button className='mo-order-btn' onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <>
          <OrderInsights orders={filteredOrders} currency={currency} />
          <div className='mo-list'>
            {filteredOrders.map((order, i) => {
              const step           = statusIndex(order.status);
              const isDelivered    = (order.status || '').toLowerCase().trim() === 'delivered';
              const isCancelled    = (order.status || '').toLowerCase().trim() === 'cancelled';
              const minutesElapsed = (Date.now() - new Date(order.createdAt).getTime()) / 60000;
              const secondsLeft    = Math.max(0, Math.round((5 * 60) - (minutesElapsed * 60)));
              const isCancellable  = order.status === 'Food Processing' && minutesElapsed <= 5;
              const displayTotal   = getOrderDisplayTotal(order);
              return (
                <div key={i} className='mo-card'>
                  <div className='mo-card-top'>
                    <div className='mo-order-icon'>{isCancelled ? '🚫' : '📦'}</div>
                    <div className='mo-order-info'>
                      <p className='mo-order-id'>Order #{String(order._id).slice(-6).toUpperCase()}</p>
                      <p className='mo-order-items'>
                        {(order.items || []).map((it, idx) =>
                          `${it.name} x${it.quantity}${idx < order.items.length - 1 ? ', ' : ''}`
                        )}
                      </p>
                    </div>
                    <div className='mo-order-right'>
                      <p className='mo-order-amount'>{currency}{displayTotal.toFixed(2)}</p>
                      <span className={`mo-status-badge ${isDelivered ? 'mo-delivered' : isCancelled ? 'mo-cancelled' : 'mo-active'}`}>
                        {isDelivered ? '✓ Delivered' : isCancelled ? '🚫 Cancelled' : '⏱ ' + (order.status || 'Processing')}
                      </span>
                    </div>
                  </div>

                  {!isCancelled && (
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
                  )}

                  <div className='mo-card-actions'>
                    {!isCancelled && (
                      <button className='mo-track-btn' onClick={() => navigate(`/order/track/${order._id}`)}>
                        🛵 Track Order
                      </button>
                    )}
                    {isCancellable && (
                      <button
                        className='mo-cancel-btn'
                        onClick={() => handleCancel(order._id)}
                        disabled={cancelling[order._id]}
                      >
                        {cancelling[order._id] ? 'Cancelling…' : `✕ Cancel (${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')})`}
                      </button>
                    )}
                  </div>

                  {isDelivered && (
                    <ReviewForm
                      orderId={order._id}
                      restaurantName={order.restaurantId?.name || 'the restaurant'}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setCancelModal(null)}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', margin: '0 16px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>🚫</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#111827', textAlign: 'center' }}>Cancel this order?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>
              This cannot be undone. The restaurant will be notified.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCancelModal(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}
              >
                Keep Order
              </button>
              <button
                onClick={() => confirmCancel(cancelModal)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;