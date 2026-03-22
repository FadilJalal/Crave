import React, { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import LiveDeliveryMap from '../../components/LiveDeliveryMap/LiveDeliveryMap';
import './OrderTracking.css';

const STEPS = [
  { key: 'Order Placed',    label: 'Order Placed', icon: '🧾', desc: 'Your order has been received.',              eta: null },
  { key: 'Food Processing', label: 'Preparing',    icon: '👨‍🍳', desc: 'The restaurant is preparing your food.',    eta: '15–25 min' },
  { key: 'Out for Delivery',label: 'On the Way',   icon: '🛵', desc: 'Your order is out for delivery.',           eta: '10–20 min' },
  { key: 'Delivered',       label: 'Delivered',    icon: '✅', desc: 'Enjoy your meal!',                          eta: null },
];

const stepIndex = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'food processing')  return 1;
  if (s === 'out for delivery') return 2;
  if (s === 'delivered')        return 3;
  return 0;
};

const POLL_INTERVAL = 5000; // 5 seconds

const OrderTracking = () => {
  const { orderId } = useParams();
  const { url, token, currency } = useContext(StoreContext);
  const navigate = useNavigate();

  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pulsing, setPulsing]       = useState(false);
  const pollRef = useRef(null);

  const fetchOrder = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${url}/api/order/track/${orderId}`, { headers: { token } });
      if (res.data.success) {
        setOrder(res.data.data);
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
    pollRef.current = setInterval(() => {
      setOrder(prev => {
        if ((prev?.status || '').toLowerCase().trim() === 'delivered') {
          clearInterval(pollRef.current);
        }
        return prev;
      });
      fetchOrder(true);
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [token, orderId]);

  const step        = order ? stepIndex(order.status) : 0;
  const currentStep = STEPS[step];
  const isDelivered = step === 3;

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!token) return (
    <div className="ot-page">
      <div className="ot-empty">
        <div className="ot-empty-icon">🔒</div>
        <p className="ot-empty-title">Please log in to track your order</p>
        <button className="ot-btn" onClick={() => navigate('/')}>Go Home</button>
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
        <p className="ot-empty-title">Order not found</p>
        <p className="ot-empty-sub">We couldn't load this order. It may have been removed.</p>
        <button className="ot-btn" onClick={() => navigate('/myorders')}>Back to Orders</button>
      </div>
    </div>
  );

  return (
    <div className="ot-page">

      <button className="ot-back" onClick={() => navigate('/myorders')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        My Orders
      </button>

      {/* Main layout: left info + right map */}
      <div className="ot-main">

        {/* LEFT: status + stepper + order details */}
        <div className="ot-left">

          {/* Hero */}
          <div className={`ot-hero ${isDelivered ? 'ot-hero-done' : ''} ${pulsing ? 'ot-pulse' : ''}`}>
            <div className="ot-hero-icon">{currentStep.icon}</div>
            <div className="ot-hero-text">
              <h1 className="ot-hero-title">{currentStep.label}</h1>
              <p className="ot-hero-desc">{currentStep.desc}</p>
              {currentStep.eta && !isDelivered && (
                <span className="ot-eta">⏱ Est. {currentStep.eta}</span>
              )}
            </div>
            <div className="ot-order-id-badge">#{String(order._id).slice(-6).toUpperCase()}</div>
          </div>

          {/* Stepper */}
          <div className="ot-stepper">
            {STEPS.map((s, idx) => {
              const done    = idx <= step;
              const active  = idx === step && !isDelivered;
              const lineActive = idx < step;
              return (
                <React.Fragment key={s.key}>
                  <div className="ot-step">
                    <div className={`ot-dot ${done ? 'ot-dot-done' : ''} ${active ? 'ot-dot-current' : ''}`}>
                      {done ? (active ? s.icon : '✓') : <span className="ot-dot-num">{idx + 1}</span>}
                    </div>
                    <p className={`ot-step-label ${done ? 'ot-label-done' : ''}`}>{s.label}</p>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`ot-line ${lineActive ? 'ot-line-active' : ''}`}>
                      {lineActive && <div className="ot-line-fill" />}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Order summary */}
          <div className="ot-card">
            <h3 className="ot-card-title">🛍 Order Summary</h3>
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
            <div className="ot-total-row"><span>Delivery fee</span><span>{currency}{(order.deliveryFee || 0).toFixed(2)}</span></div>
            <div className="ot-total-row ot-total-bold"><span>Total</span><span>{currency}{order.amount?.toFixed(2)}</span></div>
            <div className="ot-total-row">
              <span>Payment</span>
              <span className={`ot-pay-badge ${order.payment ? 'ot-paid' : 'ot-unpaid'}`}>
                {order.payment ? '✓ Paid' : 'Cash on Delivery'}
              </span>
            </div>
          </div>

          {/* Delivery details */}
          <div className="ot-card">
            <h3 className="ot-card-title">📍 Delivery Details</h3>
            <div className="ot-info-row"><span className="ot-info-label">Name</span><span className="ot-info-value">{order.address?.firstName} {order.address?.lastName}</span></div>
            <div className="ot-info-row"><span className="ot-info-label">Street</span><span className="ot-info-value">{order.address?.street}</span></div>
            <div className="ot-info-row">
              <span className="ot-info-label">City</span>
              <span className="ot-info-value">{order.address?.city}{order.address?.state ? `, ${order.address.state}` : ''}</span>
            </div>
            {order.address?.phone && (
              <div className="ot-info-row"><span className="ot-info-label">Phone</span><span className="ot-info-value">{order.address.phone}</span></div>
            )}
            <div className="ot-divider" />
            <div className="ot-info-row"><span className="ot-info-label">Placed</span><span className="ot-info-value">{formatDate(order.date || order.createdAt)}</span></div>
            {order.restaurantId?.name && (
              <div className="ot-info-row"><span className="ot-info-label">Restaurant</span><span className="ot-info-value">{order.restaurantId.name}</span></div>
            )}
          </div>

          {/* Footer */}
          <div className="ot-footer">
            {lastUpdated && (
              <p className="ot-last-updated">
                Last updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {!isDelivered && <span className="ot-live-dot" />}
              </p>
            )}
            <button className="ot-btn-outline" onClick={() => fetchOrder(false)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>

        </div>

        {/* RIGHT: map — sticky so it stays visible while scrolling left */}
        <div className="ot-right">
          <h3 className="ot-section-label">📍 Live Delivery Map</h3>
          <LiveDeliveryMap key={order.status} order={order} />
        </div>

      </div>

    </div>
  );
};

export default OrderTracking;