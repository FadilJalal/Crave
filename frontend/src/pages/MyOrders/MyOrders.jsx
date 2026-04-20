import React, { useContext, useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import './MyOrders.css';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import { useNavigate } from 'react-router-dom';
import OrderInsights from '../../components/OrderInsights/OrderInsights';
import ReviewForm from '../../components/ReviewForm/ReviewForm';

const STATUS_STEPS = ['Order Placed', 'Order Accepted', 'Food Processing', 'Out for Delivery', 'Delivered'];

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
  if (s === 'order accepted' || s === 'accepted') return 1;
  if (s === 'food processing')  return 2;
  if (s === 'out for delivery') return 3;
  if (s === 'delivered')        return 4;
  return 0;
};

const POLL_INTERVAL = 30000;

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

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const getStatusLabel = (status, isDelivered, isCancelled, t) => {
  if (isDelivered) return t('status_delivered');
  if (isCancelled) return t('status_cancelled');
  if (status === 'Order Placed') return 'Awaiting Acceptance';
  if (status === 'Order Accepted') return 'Accepted';
  return status || 'Food Processing';
};

const MyOrders = () => {
  const { t } = useTranslation();
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
  const prevStatusesRef = useRef({});

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setFetchError(false);
      const res = await axios.post(`${url}/api/order/userorders?t=${Date.now()}`, {}, { headers: { token } });
      if (res.data.success) {
        const newOrders = res.data.data || [];
        const statusMap = {};
        newOrders.forEach(o => statusMap[o._id] = o.status);
        prevStatusesRef.current = statusMap;
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
      <div className='mo-header'>
        <div className='mo-header-left'>
          <h1 className='mo-title'>{t("my_orders_title")}</h1>
          <span className='mo-subtitle'>Loading your orders…</span>
        </div>
      </div>
      <div className='mo-loading'>
        {[1, 2, 3].map(i => <div key={i} className='mo-skeleton skeleton' />)}
      </div>
    </div>
  );

  if (fetchError) return (
    <div className='mo-page'>
      <div className='mo-header'>
        <h1 className='mo-title'>{t("my_orders_title")}</h1>
      </div>
      <div className='mo-empty'>
        <div className='mo-empty-icon-wrap'>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--brand)' }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className='mo-empty-title'>{t("failed_load_orders")}</p>
        <p className='mo-empty-sub'>{t("problem_connecting_server")}</p>
        <button className='mo-order-btn' onClick={fetchOrders}>{t("try_again_btn")}</button>
      </div>
    </div>
  );

  return (
    <div className='mo-page'>
      <div className='mo-header'>
        <div className='mo-header-left'>
          <h1 className='mo-title'>{t("my_orders_title")}</h1>
          {orders.length > 0 && <span className='mo-subtitle'>{filteredOrders.length} of {orders.length} orders</span>}
        </div>
        <div className='mo-header-actions'>
          <button className='mo-refresh' onClick={fetchOrders}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            {t("refresh_btn")}
          </button>
        </div>
      </div>

      {orders.length > 0 && (
        <div className='mo-filters'>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_order_placeholder")}
            className='mo-filter-input'
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className='mo-filter-select'>
            <option value='all'>{t("all_statuses")}</option>
            <option value='food processing'>{t("status_food_processing")}</option>
            <option value='out for delivery'>{t("status_out_for_delivery")}</option>
            <option value='delivered'>{t("status_delivered")}</option>
            <option value='cancelled'>{t("status_cancelled")}</option>
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className='mo-filter-select'>
            <option value='all'>{t("all_time")}</option>
            <option value='7days'>{t("last_7_days")}</option>
            <option value='30days'>{t("last_30_days")}</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className='mo-filter-select'>
            <option value='newest'>{t("newest_first")}</option>
            <option value='oldest'>{t("oldest_first")}</option>
            <option value='highest'>{t("highest_amount")}</option>
            <option value='lowest'>{t("lowest_amount")}</option>
          </select>
          {activeFilterCount > 0 && (
            <button type='button' className='mo-clear-filters' onClick={clearFilters}>{t("clear_btn")}</button>
          )}
        </div>
      )}

      {orders.length === 0 ? (
        <div className='mo-empty'>
          <div className='mo-empty-icon-wrap'>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--brand)' }}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <p className='mo-empty-title'>{t("no_orders_yet")}</p>
          <p className='mo-empty-sub'>{t("order_history_appear")}</p>
          <button className='mo-order-btn' onClick={() => navigate('/')}>{t("start_ordering_btn")}</button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className='mo-empty'>
          <div className='mo-empty-icon-wrap'>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--brand)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <p className='mo-empty-title'>{t("no_orders_match_filters")}</p>
          <p className='mo-empty-sub'>{t("try_changing_search")}</p>
          <button className='mo-order-btn' onClick={clearFilters}>{t("clear_filters_btn")}</button>
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

              const stripeClass = isDelivered ? 'stripe-delivered' : isCancelled ? 'stripe-cancelled' : '';

              return (
                <div key={i} className='mo-card'>
                  {/* Colored top stripe */}
                  <div className={`mo-card-stripe ${stripeClass}`} />

                  {/* Card header */}
                  <div className='mo-card-top'>
                    <div className={`mo-rest-avatar ${isCancelled ? 'avatar-cancelled' : ''}`}>
                      {order.restaurantId?.image
                        ? <img src={`${url}/images/${order.restaurantId.image}`} alt="" />
                        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isCancelled ? '#9ca3af' : 'var(--brand)' }}>
                            <path d="M3 2h18l-2 9H5L3 2z"/><path d="M5 11v9a1 1 0 001 1h12a1 1 0 001-1v-9"/><path d="M12 7v10M8 9v2M16 9v2"/>
                          </svg>
                      }
                    </div>

                    <div className='mo-order-info'>
                      <div className='mo-order-meta'>
                        <span className='mo-order-id'>{t("order_id", { id: String(order._id).slice(-6).toUpperCase() })}</span>
                        <span className='mo-order-date'>{formatDate(order.createdAt)}</span>
                      </div>
                      {order.restaurantId?.name && (
                        <p className='mo-restaurant-name'>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline', marginRight: 4, opacity: 0.5 }}>
                            <path d="M3 2h18l-2 9H5L3 2z"/>
                          </svg>
                          {order.restaurantId.name}
                        </p>
                      )}
                      <p className='mo-order-items'>
                        {(order.items || []).map((it, idx) =>
                          `${it.name} x${it.quantity}${idx < order.items.length - 1 ? ' · ' : ''}`
                        )}
                      </p>
                    </div>

                    <div className='mo-order-right'>
                      <p className='mo-order-amount'>{currency}{displayTotal.toFixed(2)}</p>
                      <span className={`mo-status-badge ${isDelivered ? 'mo-delivered' : isCancelled ? 'mo-cancelled' : 'mo-active'}`}>
                        {isDelivered
                          ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> {t("status_delivered")}</>
                          : isCancelled
                          ? t("status_cancelled")
                          : <><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', marginRight: 4, animation: 'pulse 1.5s infinite' }} />{getStatusLabel(order.status, false, false, t)}</>
                        }
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {!isCancelled && (
                    <div className='mo-progress-wrap'>
                      <div className='mo-progress-title'>Order progress</div>
                      <div className='mo-progress'>
                        {STATUS_STEPS.map((s, idx) => (
                          <React.Fragment key={s}>
                            <div className='mo-prog-step'>
                              <div className={`mo-prog-dot ${idx <= step ? 'mo-prog-done' : ''} ${idx === step ? 'mo-prog-current' : ''}`}>
                                {idx < step
                                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  : idx === step
                                  ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', display: 'block' }} />
                                  : <span style={{ opacity: 0.4, fontSize: 10 }}>{idx + 1}</span>
                                }
                              </div>
                              <p className={`mo-prog-label ${idx <= step ? 'mo-prog-label-done' : ''}`}>{s}</p>
                            </div>
                            {idx < STATUS_STEPS.length - 1 && (
                              <div className={`mo-prog-line ${idx < step ? 'mo-prog-line-done' : ''} ${idx === step ? 'mo-prog-line-active' : ''}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='mo-card-divider' />

                  {/* Card actions */}
                  <div className='mo-card-actions'>
                    <div className='mo-actions-left'>
                      {!isCancelled && (
                        <button className='mo-track-btn' onClick={() => navigate(`/order/track/${order._id}`)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                          </svg>
                          {t("track_order")}
                        </button>
                      )}
                      {isCancellable && (
                        <button
                          className='mo-cancel-btn'
                          onClick={() => handleCancel(order._id)}
                          disabled={cancelling[order._id]}
                        >
                          {cancelling[order._id]
                            ? t("cancelling")
                            : <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Cancel order
                              </>
                          }
                        </button>
                      )}
                    </div>
                    {isCancellable && (
                      <span className='mo-cancel-timer'>
                        {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')} left
                      </span>
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

      {/* Cancel confirmation modal */}
      {cancelModal && (
        <div className='mo-modal-overlay' onClick={() => setCancelModal(null)}>
          <div className='mo-modal' onClick={e => e.stopPropagation()}>
            <div className='mo-modal-icon'>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3 className='mo-modal-title'>{t("cancel_modal_title")}</h3>
            <p className='mo-modal-desc'>{t("cancel_modal_desc")}</p>
            <div className='mo-modal-actions'>
              <button onClick={() => setCancelModal(null)} className='mo-modal-keep'>
                {t("keep_order_btn")}
              </button>
              <button onClick={() => confirmCancel(cancelModal)} className='mo-modal-confirm'>
                {t("yes_cancel_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;