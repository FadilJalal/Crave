import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { StoreContext } from '../../Context/StoreContext';
import './ReviewForm.css';

const StarButton = ({ star, filled, onClick, disabled }) => (
  <button
    className="rf-star-btn"
    onClick={() => onClick(star)}
    disabled={disabled}
    title={`${star} star${star !== 1 ? 's' : ''}`}
  >
    <svg width="26" height="26" viewBox="0 0 24 24"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : '#d1d5db'}
      strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  </button>
);

const ReviewForm = ({ orderId, restaurantName }) => {
  const { url, token } = useContext(StoreContext);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token || !orderId) { setChecking(false); return; }
    axios.get(`${url}/api/review/check/${orderId}`, { headers: { token } })
      .then(res => {
        if (res.data.reviewed && res.data.review) {
          setExistingReview(res.data.review);
          setRating(res.data.review.rating);
          setComment(res.data.review.comment || '');
          setSubmitted(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [orderId, token, url]);

  const handleSubmit = async () => {
    if (rating < 1) { toast.error('Please select a star rating.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(
        `${url}/api/review/submit`,
        { orderId, rating, comment },
        { headers: { token } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setSubmitted(true);
        setEditing(false);
        setExistingReview({ rating, comment });
      } else {
        toast.error(res.data.message || 'Could not submit review.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  const displayStar = hovered || rating;

  if (submitted && !editing) {
    return (
      <div className="rf-wrap">
        <p className="rf-title">Restaurant Review</p>
        <div className="rf-done">
          <span className="rf-done-icon">⭐</span>
          <div>
            <p className="rf-done-text">
              You rated {restaurantName} {existingReview?.rating || rating}/5
            </p>
            {(existingReview?.comment || comment) && (
              <p className="rf-done-sub">"{existingReview?.comment || comment}"</p>
            )}
          </div>
          <button className="rf-edit-btn" onClick={() => setEditing(true)}>Edit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rf-wrap">
      <p className="rf-title">Rate your experience at {restaurantName}</p>
      <div className="rf-stars" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map(star => (
          <StarButton
            key={star}
            star={star}
            filled={displayStar >= star}
            onClick={setRating}
            disabled={loading}
          />
        ))}
        {rating > 0 && (
          <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', alignSelf: 'center', marginLeft: 4 }}>
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </span>
        )}
      </div>
      <textarea
        className="rf-textarea"
        rows={3}
        maxLength={500}
        placeholder="Tell others about your experience (optional)…"
        value={comment}
        onChange={e => setComment(e.target.value)}
        disabled={loading}
      />
      <div className="rf-submit-row">
        <span className="rf-charcount">{comment.length}/500</span>
        {editing && (
          <button
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text-2)', marginLeft: 'auto' }}
            onClick={() => { setEditing(false); setRating(existingReview?.rating || 0); setComment(existingReview?.comment || ''); }}
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          className="rf-submit-btn"
          onClick={handleSubmit}
          disabled={loading || rating < 1}
        >
          {loading ? 'Submitting…' : editing ? 'Update Review' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default ReviewForm;