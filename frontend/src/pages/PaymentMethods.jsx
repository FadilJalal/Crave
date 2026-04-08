

import React, { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { useContext } from 'react';
import { StoreContext } from '../Context/StoreContext';
import axios from 'axios';

function maskCardNumber(num) {
  return num ? `**** **** **** ${num.slice(-4)}` : "";
}

function getCardTypeIcon(number) {
  if (/^4/.test(number)) return <span style={{fontSize:22,marginRight:8}}>💳</span>; // Visa
  if (/^5[1-5]/.test(number)) return <span style={{fontSize:22,marginRight:8}}>💳</span>; // Mastercard
  // Add more icons/types as needed
  return <span style={{fontSize:22,marginRight:8}}>💳</span>;
}
// Main PaymentMethods component
export default function PaymentMethods() {
  const [cards, setCards] = useState([]);
  const { url, token } = useContext(StoreContext);
  // Get userId from localStorage (assumes userInfo is stored after login)
  const [userId, setUserId] = useState(() => {
    try {
      const info = JSON.parse(localStorage.getItem("userInfo"));
      return info?._id || info?.id || "";
    } catch {
      return "";
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Fetch cards from backend using userId from localStorage
    async function fetchCards() {
      if (!userId) return setCards([]);
      try {
        const cardsRes = await axios.get(`${url}/api/cards/list?userId=${userId}`);
        setCards(cardsRes.data.cards || []);
      } catch {
        setCards([]);
      }
    }
    fetchCards();
  }, [userId, url]);

  const handleAddCard = async (e) => {
    e.preventDefault();
    setError("");
    if (!stripe || !elements) return;
    if (!name) { setError("Name is required"); return; }
    setLoading(true);
    const cardElement = elements.getElement(CardElement);
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { name }
    });
    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }
    try {
      // Save card to backend
      const res = await axios.post(`${url}/api/cards/save`, {
        userId,
        paymentMethodId: paymentMethod.id
      });
      if (res.data.success) {
        setCards([...cards, res.data.card]);
        setShowForm(false);
        setName("");
        cardElement.clear();
      } else {
        setError(res.data.message || "Failed to save card");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save card");
    }
    setLoading(false);
  };

  const handleRemove = async idx => {
    const card = cards[idx];
    if (!card) return;
    try {
      await axios.post(`${url}/api/cards/delete`, { userId, paymentMethodId: card.paymentMethodId });
      setCards(cards.filter((_, i) => i !== idx));
    } catch {}
  };

  return (
    <div className="app" style={{ minHeight: '70vh', paddingTop: 32, paddingBottom: 32 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, marginBottom: 6, fontFamily: 'var(--font-display)' }}>Payment Methods</h2>
        <p style={{ color: 'var(--text-2)', marginBottom: 32, fontSize: 17 }}>Manage your saved payment methods here.</p>

        {cards.length === 0 && <div style={{ color: "var(--text-3)", margin: "24px 0", fontSize: 17 }}>No cards saved yet.</div>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {cards.map((card, idx) => (
            <li key={idx} style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 22,
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-sm)",
              transition: "box-shadow 0.2s",
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {getCardTypeIcon(card.brand)}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: 'var(--text)' }}>**** **** **** {card.last4}</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>{card.name} &nbsp;|&nbsp; Exp: {card.exp}</div>
                </div>
              </div>
              <button onClick={() => handleRemove(idx)} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14, transition: 'background 0.2s' }}>Remove</button>
            </li>
          ))}
        </ul>

        {showForm ? (
          <form onSubmit={handleAddCard} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: 28, marginTop: 24, boxShadow: "var(--shadow-sm)" }}>
            <h4 style={{ margin: "0 0 18px", fontWeight: 800, fontSize: 19, fontFamily: 'var(--font-display)' }}>Add New Card</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'block', color: 'var(--text-2)' }}>Name on Card</label>
              <input name="name" value={name} onChange={e => setName(e.target.value)} placeholder="Name on Card" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 15, background: 'var(--bg)', color: 'var(--text)' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'block', color: 'var(--text-2)' }}>Card Details</label>
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: 10, background: 'var(--bg)' }}>
                <CardElement options={{ style: { base: { fontSize: '16px', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', '::placeholder': { color: 'var(--text-3)' } }, invalid: { color: '#dc2626' } } }} />
              </div>
            </div>
            {error && <div style={{ color: "#dc2626", marginBottom: 10, fontWeight: 700 }}>{error}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button type="submit" disabled={loading} style={{ background: "linear-gradient(90deg,#ff4e2a,#ff6a3d)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontWeight: 800, cursor: loading ? 'not-allowed' : "pointer", fontSize: 15, boxShadow: "0 2px 8px 0 rgba(255,78,42,0.08)" }}>{loading ? 'Saving...' : 'Save Card'}</button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ background: "var(--bg)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 28px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} style={{ background: "linear-gradient(90deg,#ff4e2a,#ff6a3d)", color: "#fff", border: "none", borderRadius: 10, padding: "14px 0", fontWeight: 900, marginTop: 28, cursor: "pointer", width: "100%", fontSize: 17, boxShadow: "0 2px 8px 0 rgba(255,78,42,0.08)" }}>+ Add New Card</button>
        )}
      </div>
    </div>
  );
}
