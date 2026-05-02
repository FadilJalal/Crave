import React, { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { io } from 'socket.io-client';
import { StoreContext } from '../../Context/StoreContext';
import LiveDeliveryMap from '../../components/LiveDeliveryMap/LiveDeliveryMap';
import { toast } from 'react-toastify';
import './OrderTracking.css';

const STEPS = (t) => [
  { key: 'Placed',      label: "Order Secured",    icon: '🧾', desc: "We've sent your request to the kitchen", color: "#6366f1" },
  { key: 'Accepted',    label: "In the Queue",     icon: '📋', desc: "Restaurant is prepping ingredients", color: "#8b5cf6" },
  { key: 'Food Processing', label: "Cooking",      icon: '🔥', desc: "The Chef is fire-grilling your meal", color: "#f59e0b" },
  { key: 'Out for Delivery',label: "Dispatched",     icon: '🛵', desc: "Courier is navigating your route", color: "#10b981" },
  { key: 'Delivered',   label: "Arrival",          icon: '🏁', desc: "Enjoy your Crave experience!", color: "#06b6d4" },
];

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) { console.error('Audio failed', e); }
};

const stepIndex = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'order accepted' || s === 'accepted') return 1;
  if (s === 'food processing')  return 2;
  if (s === 'ready' || s === 'out for delivery') return 3;
  if (s === 'delivered')        return 4;
  return 0;
};


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

const OrderTracking = () => {
  const { orderId } = useParams();
  const { url, token, currency } = useContext(StoreContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pulsing, setPulsing]       = useState(false);
  const prevStatusRef = useRef(null);

  const fetchOrder = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${url}/api/order/track/${orderId}?t=${Date.now()}`, { headers: { token } });
      if (res.data.success) {
        const newOrder = res.data.data;
        
        prevStatusRef.current = newOrder.status;

        setOrder(newOrder);
        setLastUpdated(new Date());
        setError(false);
        if (silent) { setPulsing(true); setTimeout(() => setPulsing(false), 600); }
      } else { setError(true); }
    } catch { setError(true); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    fetchOrder();
  }, [token, orderId]);

  useEffect(() => {
    if (order?.userId) {
      const socket = io(url);
      socket.emit("register:user", order.userId);
      socket.on("order:statusUpdate", (data) => {
        if (data.orderId === orderId) {
          setOrder(prev => ({ ...prev, status: data.status, updatedAt: data.updatedAt }));
          playNotificationSound();
        }
      });
      return () => socket.disconnect();
    }
  }, [order?.userId, orderId, url]);

  const step         = order ? stepIndex(order.status) : 0;
  const isDelivered  = step === 4;
  const currentStep  = STEPS(t)[step];
  const displayTotal = order ? getOrderDisplayTotal(order) : 0;
  const splitCashDue = order?.paymentMethod === 'split' ? Math.max(0, Number(order?.amount || 0)) : 0;

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!token) return (
    <div className="ot-page">
      <div className="ot-empty">
        <div className="ot-empty-icon">🔒</div>
        <p className="ot-empty-title">{t("please_login_track")}</p>
        <button className="ot-btn" onClick={() => navigate('/')}>{t("go_home")}</button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="ot-page">
      <div className="ot-skeleton-wrap">
        <div className="ot-sk ot-sk-hero skeleton" />
        <div className="ot-sk ot-sk-steps skeleton" />
        <div className="ot-sk ot-sk-card skeleton" />
      </div>
    </div>
  );

  if (error || !order) return (
    <div className="ot-page">
      <div className="ot-empty">
        <div className="ot-empty-icon">⚠️</div>
        <p className="ot-empty-title">{t("order_not_found")}</p>
        <p className="ot-empty-sub">{t("order_removed_desc")}</p>
        <button className="ot-btn" onClick={() => navigate('/myorders')}>{t("back_to_orders")}</button>
      </div>
    </div>
  );

  // --- WAITING SCREEN LOGIC ---
  // Show waiting screen for "Order Placed" or "Waiting for acceptance"
  const isPending = ['order placed', 'waiting for acceptance', 'awaiting acceptance', 'pending'].includes((order?.status || '').toLowerCase().trim());
  
  if (isPending) return (
    <div className="ot-page ot-waiting-page">
      <div className="app-container">
        <div className="ot-waiting-container">
          <div className="ot-waiting-card">
            <div className="ot-waiting-visual">
              <div className="ot-waiting-pulse" />
              <div className="ot-waiting-icon">🥣</div>
            </div>
            
            <h1 className="ot-waiting-title">{t("Waiting for Restaurant...")}</h1>
            <p className="ot-waiting-desc">
              Your order has been received! We've notified the restaurant, 
              and we're just waiting for them to start preparing your delicious meal.
            </p>
            
            <div className="ot-waiting-status-chip">
              <span className="ot-live-dot" /> {t("Live: Awaiting Confirmation")}
            </div>
          </div>

          <div className="ot-card ot-waiting-summary">
            <div className="ot-summary-header">
              <span className="ot-summary-label">Order Details</span>
              <span className="ot-summary-id">#{String(order._id).slice(-6).toUpperCase()}</span>
            </div>
            <div className="ot-divider" />
            <ul className="ot-items">
              {(order.items || []).map((item, i) => (
                <li key={i} className="ot-item">
                  <span className="ot-item-name">{item.name}</span>
                  <span className="ot-item-qty">×{item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="ot-divider" />
            <div className="sdw-savings-badge">
              {order?.sharedRole === 'matcher' ? `Matched & Saved!` : `Instant Cashback: ${currency}${order?.sharedSavings.toFixed(2)}`}
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 600, color: '#166534' }}>
               📍 You are Stop #{order?.deliverySequence || 1} on the delivery route.
            </div>
            <div className="ot-total-row ot-total-bold">
              <span>{t("total")}</span>
              <span>{currency}{displayTotal.toFixed(2)}</span>
            </div>
          </div>

          <p className="ot-waiting-tip">💡 Tip: Hang tight! Most restaurants accept within 2-3 minutes.</p>
        </div>
      </div>
    </div>
  );

  const isCancelled = (order?.status || '').toLowerCase().trim() === 'cancelled';
  if (isCancelled) return (
    <div className="ot-page">
      <div className="app-container">
        <div className="ot-empty">
          <div className="ot-empty-icon">🚫</div>
          <h1 className="ot-empty-title" style={{ fontSize: 24, marginBottom: 8 }}>{t("Order Cancelled")}</h1>
          <p className="ot-empty-sub" style={{ maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
            {t("Order #{{id}} was not accepted by the restaurant or has been cancelled.", { id: String(order._id).slice(-6).toUpperCase() })}
            <br />
            {t("Any payments made will be refunded to your account.")}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
             <button className="ot-btn-outline" onClick={() => navigate('/myorders')}>{t("back_to_orders")}</button>
             <button className="ot-btn" onClick={() => navigate('/')}>{t("browse_other_restaurants")}</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ot-page">
      <div className="app-container">
        <button className="ot-back" onClick={() => navigate('/myorders')} style={{ flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: i18n.language === 'ar' ? 'scaleX(-1)' : 'none' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {t("my_orders_title")}
        </button>

        {/* Main layout: left info + right map */}
        <div className="ot-main">

          {/* LEFT: status + stepper + order details */}
          <div className="ot-left">

            {/* --- Shared Delivery Bonus Banner --- */}
            {order?.deliveryPreference === 'shared' && (
              <div style={{
                background: order?.isSharedDelivery ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                border: order?.isSharedDelivery ? '1.5px solid #22c55e' : '1.5px solid #f97316',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                animation: 'fadeUp 0.4s ease'
              }}>
                <div style={{ fontSize: '28px' }}>{order?.isSharedDelivery ? '🤝' : '🔍'}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 800, color: order?.isSharedDelivery ? '#166534' : '#9a3412', fontSize: '15px' }}>
                    {order?.isSharedDelivery 
                      ? `Shared Delivery Matched! (Stop ${order?.deliverySequence || 1})` 
                      : 'Shared Delivery Active'}
                  </p>
                  <p style={{ margin: 0, color: order?.isSharedDelivery ? '#15803d' : '#c2410c', fontSize: '13px', fontWeight: 500, lineHeight: 1.4 }}>
                    {order?.isSharedDelivery 
                      ? (order?.sharedRole === 'matcher'
                          ? `A neighbor is ordering from the same area. Since you joined a partner, your ${currency}${order?.sharedSavings.toFixed(2)} savings were applied upfront!`
                          : `A neighbor joined your delivery! ${currency}${order?.sharedSavings.toFixed(2)} has been credited to your Crave Wallet.`)
                      : `We're still looking for a neighbor nearby. If found within the first 10 mins, you'll get 50% cashback automatically!`
                    }
                  </p>
                </div>
                {order?.isSharedDelivery && <div style={{ background: '#22c55e', color: '#fff', padding: '4px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 900 }}>SAVED</div>}
              </div>
            )}

            {/* Hero */}
            <div className={`ot-hero ${isDelivered ? 'ot-hero-done' : ''} ${pulsing ? 'ot-pulse' : ''}`}>
              <div className="ot-hero-icon">{currentStep.icon}</div>
              <div className="ot-hero-text">
                <h1 className="ot-hero-title">{currentStep.label}</h1>
                <p className="ot-hero-desc">{currentStep.desc}</p>
                {currentStep.eta && !isDelivered && (
                  <span className="ot-eta">⏱ {t("est")} {currentStep.eta}</span>
                )}
              </div>
              <div className="ot-order-id-badge">#{String(order._id).slice(-6).toUpperCase()}</div>
            </div>

            {/* Pipeline Stepper */}
            <div className="ot-pipeline">
              <div className="ot-pipeline-track">
                <div className="ot-pipeline-line" />
                <div className="ot-pipeline-progress" style={{ width: `${(step / 4) * 100}%` }} />
              </div>
              
              {STEPS(t).map((s, idx) => {
                const done    = idx <= step;
                const active  = idx === step;
                return (
                  <div key={s.key} className={`ot-pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                    <div className="ot-pipeline-icon-wrap" style={{ 
                      "--step-color": s.color,
                      transform: active ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: active ? `0 0 20px ${s.color}66` : 'none'
                    }}>
                       <span className="ot-pipeline-icon">{s.icon}</span>
                       {active && <div className="ot-pipeline-pulse" style={{ background: s.color }} />}
                    </div>
                    <div className="ot-pipeline-label">{s.label}</div>
                    {active && <div className="ot-pipeline-desc-pop">{s.desc}</div>}
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div className="ot-card">
              <h3 className="ot-card-title">🛍 {t("order_summary")}</h3>
              <ul className="ot-items">
                {(order.items || []).map((item, i) => (
                  <li key={i} className="ot-item">
                    <span className="ot-item-name">{item.name}</span>
                    <span className="ot-item-qty">×{item.quantity}</span>
                    <span className="ot-item-price">{currency}{(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="ot-divider" />
              <div className="ot-total-row"><span>{t("delivery_fee")}</span><span>{currency}{(order.deliveryFee || 0).toFixed(2)}</span></div>
              {order.paymentMethod === 'split' && (
                <div className="ot-total-row"><span>{t("cash_due")}</span><span>{currency}{splitCashDue.toFixed(2)}</span></div>
              )}
              <div className="ot-total-row ot-total-bold"><span>{t("total")}</span><span>{currency}{displayTotal.toFixed(2)}</span></div>
              <div className="ot-total-row">
                <span>{t("payment")}</span>
                <span className={`ot-pay-badge ${order.payment ? 'ot-paid' : 'ot-unpaid'}`}>
                  {order.payment ? `✓ ${t("paid")}` : t("cash_on_delivery")}
                </span>
              </div>
            </div>

            {/* Delivery details */}
            <div className="ot-card">
              <h3 className="ot-card-title">📍 {t("delivery_details")}</h3>
              <div className="ot-info-row"><span className="ot-info-label">{t("name")}</span><span className="ot-info-value">{order.address?.firstName} {order.address?.lastName}</span></div>
              <div className="ot-info-row"><span className="ot-info-label">{t("street")}</span><span className="ot-info-value">{order.address?.street}</span></div>
              <div className="ot-info-row">
                <span className="ot-info-label">{t("city")}</span>
                <span className="ot-info-value">{order.address?.city}{order.address?.state ? `, ${order.address.state}` : ''}</span>
              </div>
              {order.address?.phone && (
                <div className="ot-info-row"><span className="ot-info-label">{t("phone")}</span><span className="ot-info-value">{order.address.phone}</span></div>
              )}
              <div className="ot-divider" />
              <div className="ot-info-row"><span className="ot-info-label">{t("placed")}</span><span className="ot-info-value">{formatDate(order.date || order.createdAt)}</span></div>
              {order.restaurantId?.name && (
                <div className="ot-info-row"><span className="ot-info-label">{t("restaurant")}</span><span className="ot-info-value">{order.restaurantId.name}</span></div>
              )}
            </div>

            {/* Footer */}
            <div className="ot-footer">
              {lastUpdated && (
                <p className="ot-last-updated">
                  {t("last_updated")} {lastUpdated.toLocaleTimeString(i18n.language === 'ar' ? 'ar-AE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  {!isDelivered && <span className="ot-live-dot" />}
                </p>
              )}
              <button className="ot-btn-outline" onClick={() => fetchOrder(false)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                {t("refresh_btn")}
              </button>
            </div>

          </div>

          {/* RIGHT: map — sticky so it stays visible while scrolling left */}
          <div className="ot-right">
            <h3 className="ot-section-label">📍 {t("live_delivery_map")}</h3>
            <LiveDeliveryMap order={order} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderTracking;