import React, { useState, useEffect, useContext } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StoreContext } from "../../Context/StoreContext";
import axios from "axios";
import "./PaymentMethods.css";

/* ===== Card Brand Icons ===== */
const CARD_BRANDS = {
  visa: "https://img.icons8.com/color/32/000000/visa.png",
  mastercard: "https://img.icons8.com/color/32/000000/mastercard-logo.png",
  amex: "https://img.icons8.com/color/32/000000/amex.png",
};

function CardBrandIcon({ brand }) {
  const src = CARD_BRANDS[brand?.toLowerCase()];
  if (src) return <img src={src} alt={brand} style={{ height: 22 }} />;
  return <span style={{ fontSize: 22 }}>💳</span>;
}

export default function PaymentMethods() {
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const { url, token } = useContext(StoreContext);
  const stripe = useStripe();
  const elements = useElements();

  /* ===== Fetch Cards ===== */
  useEffect(() => {
    let mounted = true;

    async function fetchCards() {
      setFetching(true);
      setError("");

      if (!token) {
        setCards([]);
        setFetching(false);
        return;
      }

      try {
        const res = await axios.get(`${url}/api/cards/list`, {
          headers: { token },
        });
        if (mounted) setCards(res.data.cards || []);
      } catch {
        if (mounted) setError("Failed to fetch cards.");
      }

      if (mounted) setFetching(false);
    }

    fetchCards();
    return () => (mounted = false);
  }, [token, url]);

  /* ===== Add Card ===== */
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (!stripe || !elements) return;
    if (!name) return setError("Name is required");

    setLoading(true);

    const cardElement = elements.getElement(CardElement);

    const { error: stripeError, paymentMethod } =
      await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: { name },
      });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${url}/api/cards/save`,
        { paymentMethodId: paymentMethod.id },
        { headers: { token } }
      );

      if (res.data.success) {
        setCards((prev) => [...prev, res.data.card]);
        setShowForm(false);
        setName("");
        setSuccess("Card added!");
        cardElement.clear();
      } else {
        setError(res.data.message || "Failed to save card");
      }
    } catch {
      setError("Failed to save card");
    }

    setLoading(false);
    setTimeout(() => setSuccess(""), 2500);
  };

  /* ===== Remove Card ===== */
  const handleRemove = async (idx) => {
    if (loading) return;

    const card = cards[idx];
    if (!card) return;

    setLoading(true);
    setError("");

    try {
      await axios.post(
        `${url}/api/cards/delete`,
        { paymentMethodId: card.paymentMethodId },
        { headers: { token } }
      );

      setCards((prev) => prev.filter((_, i) => i !== idx));
      setSuccess("Card removed");
    } catch {
      setError("Failed to remove card");
    }

    setLoading(false);
    setTimeout(() => setSuccess(""), 2000);
  };

  return (
    <main className="pm-main-bg">
      <section className="pm-section">
        <header className="pm-header">
          <h1 className="pm-title-pro">Payment Methods</h1>
          <button
            className="pm-add-btn-pro"
            onClick={() => setShowForm((prev) => !prev)}
            disabled={loading || fetching}
          >
            {showForm ? "Cancel" : "+ Add Card"}
          </button>
        </header>

        {/* ===== Form ===== */}
        {showForm && (
          <form className="pm-form-pro" onSubmit={handleAddCard}>
            <label className="pm-label-pro">Name on Card</label>

            <input
              className="pm-input-pro"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />

            <div className="pm-card-el-pro">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#333",
                      "::placeholder": { color: "#aaa" },
                    },
                    invalid: { color: "#ff385c" },
                  },
                }}
              />
            </div>

            {error && <div className="pm-error-pro">{error}</div>}
            {success && <div className="pm-success-pro">{success}</div>}

            <button className="pm-save-btn-pro" disabled={loading}>
              {loading ? "Saving..." : "Save Card"}
            </button>
          </form>
        )}

        {/* ===== Cards List ===== */}
        <div className="pm-list-pro">
          {fetching && <div className="pm-loading-pro">Loading...</div>}

          {!fetching && cards.length === 0 && !error && (
            <div className="pm-empty-pro">No cards saved yet</div>
          )}

          {!showForm && error && (
            <div className="pm-error-pro">{error}</div>
          )}

          {!showForm && success && (
            <div className="pm-success-pro">{success}</div>
          )}

          {cards.map((card, idx) => (
            <div key={idx} className="pm-item-pro">
              <CardBrandIcon brand={card.brand} />

              <span className="pm-card-info-pro">
                **** **** **** {card.last4}
                <span className="pm-card-brand-pro">
                  {" "}({card.brand})
                </span>
              </span>

              <button
                className="pm-remove-btn-pro"
                onClick={() => handleRemove(idx)}
                disabled={loading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}