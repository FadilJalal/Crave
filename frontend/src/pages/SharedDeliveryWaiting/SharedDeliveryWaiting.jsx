import React, { useContext, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../Context/StoreContext';
import axios from 'axios';
import './SharedDeliveryWaiting.css';

const POLL_INTERVAL = 3000; // Check every 3 seconds

const SharedDeliveryWaiting = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { url, token, currency } = useContext(StoreContext);

  const [order, setOrder] = useState(null);
  const [matched, setMatched] = useState(false);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [savings, setSavings] = useState(0);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  // Fetch order + restaurant config to get the match window
  useEffect(() => {
    if (!token || !orderId) return;

    const init = async () => {
      try {
        const res = await axios.get(`${url}/api/order/track/${orderId}`, { headers: { token } });
        if (res.data.success) {
          const o = res.data.data;
          setOrder(o);

          // If already matched, show immediately
          if (o.isSharedDelivery && o.sharedMatchedOrderId) {
            setMatched(true);
            setSavings(o.sharedSavings || 0);
            return;
          }

          // If not shared preference, redirect away
          if (o.deliveryPreference !== 'shared') {
            navigate(`/order/track/${orderId}`);
            return;
          }

          // Start countdown from the match window (default 2 min for the waiting screen)
          const matchWindowSec = 120; // 2 minutes search time
          const elapsed = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 1000);
          const remaining = Math.max(0, matchWindowSec - elapsed);
          setTimeLeft(remaining);
          startedRef.current = true;
        } else {
          navigate('/myorders');
        }
      } catch {
        navigate('/myorders');
      }
    };

    init();
  }, [token, orderId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || matched || expired) return;

    if (timeLeft <= 0) {
      setExpired(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null, matched, expired]);

  // Poll for match
  useEffect(() => {
    if (!startedRef.current || !token || matched || expired) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${url}/api/order/track/${orderId}`, { headers: { token } });
        if (res.data.success) {
          const o = res.data.data;
          if (o.isSharedDelivery && o.sharedMatchedOrderId) {
            setMatched(true);
            setSavings(o.sharedSavings || 0);
            setOrder(o);
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
          }
        }
      } catch {}
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, [startedRef.current, token, matched, expired]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = timeLeft !== null && !matched ? ((120 - timeLeft) / 120) * 100 : 0;

  return (
    <div className="sdw-page">
      <div className="sdw-card">
        {/* ─── SEARCHING STATE ─── */}
        {!matched && !expired && timeLeft !== null && (
          <>
            <div className="sdw-radar">
              <div className="sdw-radar-pulse" />
              <div className="sdw-radar-pulse sdw-radar-pulse-2" />
              <div className="sdw-radar-icon">🤝</div>
            </div>

            <h2 className="sdw-title">Finding Your Delivery Partner</h2>
            <p className="sdw-subtitle">
              Looking for a neighbor ordering from the same restaurant...
            </p>

            <div className="sdw-timer-wrap">
              <div className="sdw-timer-bar">
                <div className="sdw-timer-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="sdw-timer-text">
                <span>⏱️ {formatTime(timeLeft)}</span>
                <span className="sdw-timer-label">remaining</span>
              </div>
            </div>

            <div className="sdw-info">
              <div className="sdw-info-item">
                <span className="sdw-info-icon">📍</span>
                <span>Searching within your delivery area</span>
              </div>
              <div className="sdw-info-item">
                <span className="sdw-info-icon">🍽️</span>
                <span>{order?.restaurantId?.name || 'Restaurant'}</span>
              </div>
            </div>

            <button className="sdw-skip" onClick={() => navigate(`/order/track/${orderId}`)}>
              Skip waiting → Track my order
            </button>
          </>
        )}

        {/* ─── MATCHED STATE ─── */}
        {matched && (
          <>
            <div className="sdw-success-icon">🎉</div>
            <h2 className="sdw-title sdw-title-success">Match Found!</h2>
            <p className="sdw-subtitle">
              A neighbor is ordering from the same area. Your deliveries will be bundled!
            </p>

            {savings > 0 && (
              <div className="sdw-savings-badge">
                You saved {currency}{savings.toFixed(2)} on delivery!
              </div>
            )}

            <button className="sdw-cta" onClick={() => navigate(`/order/track/${orderId}`)}>
              Track My Order →
            </button>
          </>
        )}

        {/* ─── EXPIRED STATE ─── */}
        {expired && !matched && (
          <>
            <div className="sdw-expired-icon">⏰</div>
            <h2 className="sdw-title">No Match Found</h2>
            <p className="sdw-subtitle">
              No one nearby ordered during the search window. Your order will be delivered normally — don't worry, your food is on its way!
            </p>

            <button className="sdw-cta" onClick={() => navigate(`/order/track/${orderId}`)}>
              Track My Order →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SharedDeliveryWaiting;
