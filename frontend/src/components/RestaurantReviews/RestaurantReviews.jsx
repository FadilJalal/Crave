import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { StoreContext } from '../../Context/StoreContext';
import './RestaurantReviews.css';

const StarRow = ({ rating, size = 16 }) => (
  <div className="rr-stars-row">
    {[1, 2, 3, 4, 5].map(s => (
      <svg key={s} width={size} height={size} viewBox="0 0 24 24"
        fill={rating >= s ? '#f59e0b' : 'none'}
        stroke={rating >= s ? '#f59e0b' : '#d1d5db'}
        strokeWidth="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
};

const RestaurantReviews = ({ restaurantId, restaurantName }) => {
  const { url } = useContext(StoreContext);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

  useEffect(() => {
    if (!restaurantId) return;
    axios.get(`${url}/api/review/restaurant/${restaurantId}`)
      .then(res => {
        if (res.data.success) {
          setReviews(res.data.data || []);
          setAvgRating(res.data.avgRating || 0);
          setTotal(res.data.total || 0);
          const bd = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          (res.data.data || []).forEach(r => { bd[r.rating] = (bd[r.rating] || 0) + 1; });
          setBreakdown(bd);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId, url]);

  return (
    <div className="rr-section">
      <div className="rr-header">
        <h2 className="rr-title">Customer Reviews</h2>
        {total > 0 && (
          <div className="rr-summary">
            <div style={{ textAlign: 'center' }}>
              <div className="rr-big-rating">{avgRating.toFixed(1)}</div>
              <StarRow rating={Math.round(avgRating)} size={14} />
              <div className="rr-count">{total} review{total !== 1 ? 's' : ''}</div>
            </div>
            <div className="rr-breakdown">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className="rr-bar-row">
                  <span className="rr-bar-label">{star}</span>
                  <div className="rr-bar-track">
                    <div
                      className="rr-bar-fill"
                      style={{ width: total > 0 ? `${(breakdown[star] / total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="rr-bar-num">{breakdown[star] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rr-loading">
          {[1, 2, 3].map(i => <div key={i} className="rr-skeleton skeleton" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rr-empty">
          <div className="rr-empty-icon">💬</div>
          <p className="rr-empty-text">No reviews yet</p>
          <p className="rr-empty-sub">Be the first to review this restaurant after your delivery.</p>
        </div>
      ) : (
        <div className="rr-list">
          {reviews.map(review => (
            <div key={review._id} className="rr-card">
              <div className="rr-card-top">
                <div className="rr-avatar">
                  {(review.userName || 'C')[0].toUpperCase()}
                </div>
                <div className="rr-user-info">
                  <p className="rr-user-name">{review.userName || 'Customer'}</p>
                  <p className="rr-date">{timeAgo(review.createdAt)}</p>
                </div>
                <StarRow rating={review.rating} size={15} />
              </div>

              {review.comment && (
                <p className="rr-comment">"{review.comment}"</p>
              )}

              {/* Restaurant reply */}
              {review.reply?.text && (
                <div className="rr-reply">
                  <div className="rr-reply-header">
                    <span className="rr-reply-icon">🍽️</span>
                    <span className="rr-reply-label">{restaurantName || 'Restaurant'} replied</span>
                    <span className="rr-reply-date">{timeAgo(review.reply.repliedAt)}</span>
                  </div>
                  <p className="rr-reply-text">{review.reply.text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantReviews;