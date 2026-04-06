import { useState, useEffect } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import axios from "axios";
import { toast } from "react-toastify";
import "./SplitPayment.css";

const cardElementStyle = {
  style: {
    base: {
      fontSize: "15px",
      color: "#111827",
      "::placeholder": { color: "#9ca3af" },
    },
  },
};

export default function SplitPayment({ total, apiBaseUrl, currency = "AED", onComplete, onPlanUpdate }) {
  const stripe = useStripe();
  const elements = useElements();
  const cardKeys = ["card1", "card2", "card3"];

  const [cardAmounts, setCardAmounts] = useState({ card1: "", card2: "", card3: "" });
  const [paidAmounts, setPaidAmounts] = useState({ card1: 0, card2: 0, card3: 0 });
  const [visibleCards, setVisibleCards] = useState(1);
  // which card slot the shared CardElement is currently being used for
  const [activeKey, setActiveKey] = useState("card1");
  const [cardReady, setCardReady] = useState(false);
  const [processingKey, setProcessingKey] = useState("");
  const [loading, setLoading] = useState(false);

  const activeCardKeys = cardKeys.slice(0, visibleCards);

  const amountValue = (v) => {
    const n = parseFloat(String(v).replace(/,/g, "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const plannedCardAmount = activeCardKeys.reduce((sum, key) => sum + amountValue(cardAmounts[key]), 0);
  const paidCardAmount = activeCardKeys.reduce((sum, key) => sum + Number(paidAmounts[key] || 0), 0);
  const plannedCashAmount = Math.max(total - plannedCardAmount, 0);
  const remainingCashAfterPaid = Math.max(total - paidCardAmount, 0);
  const isValidCardSplit = plannedCardAmount > 0 && plannedCardAmount <= total + 0.0001;

  useEffect(() => {
    if (onPlanUpdate) {
      onPlanUpdate({ plannedCardAmount, paidCardAmount, plannedCashAmount, remainingCashAfterPaid });
    }
  }, [plannedCardAmount, paidCardAmount, plannedCashAmount, remainingCashAfterPaid]);

  const setCardAmount = (key, value) => {
    const cleaned = String(value).replace(/,/g, ".");
    if (/^\d*(\.\d{0,2})?$/.test(cleaned)) {
      if (cleaned === "") { setCardAmounts((p) => ({ ...p, [key]: "" })); return; }
      const paid = Number(paidAmounts[key] || 0);
      const numeric = Math.max(Number(cleaned || 0), paid);
      setCardAmounts((p) => ({ ...p, [key]: String(Number(numeric.toFixed(2))) }));
    }
  };

  const addCard = () => {
    const next = visibleCards + 1;
    setVisibleCards(Math.min(3, next));
    setActiveKey(`card${Math.min(3, next)}`);
  };

  const removeLastCard = () => {
    if (visibleCards <= 1) return;
    const lastKey = `card${visibleCards}`;
    if (Number(paidAmounts[lastKey] || 0) > 0) { toast.info(`Card ${visibleCards} already charged, cannot remove.`); return; }
    setVisibleCards((p) => p - 1);
    setActiveKey(`card${visibleCards - 1}`);
    setCardAmounts((p) => ({ ...p, [lastKey]: "" }));
    setPaidAmounts((p) => ({ ...p, [lastKey]: 0 }));
  };

  const paySingleCard = async (key, label) => {
    if (!isValidCardSplit) { toast.error(`Total card amounts must be between 0 and ${currency}${total.toFixed(2)}.`); return; }
    if (!stripe || !elements) { toast.error("Stripe not ready."); return; }
    if (!cardReady) { toast.error(`Enter ${label} details in the card field below, then click this button.`); return; }

    const target = amountValue(cardAmounts[key]);
    const alreadyPaid = Number(paidAmounts[key] || 0);
    const chargeAmount = Number((target - alreadyPaid).toFixed(2));

    if (target <= 0) { toast.error(`Set an amount for ${label} first.`); return; }
    if (chargeAmount <= 0) { toast.info(`${label} is already fully paid.`); return; }

    const card = elements.getElement(CardElement);
    if (!card) { toast.error("Card input not ready."); return; }

    try {
      setLoading(true);
      setProcessingKey(key);
      const res = await axios.post(`${apiBaseUrl}/api/payment/create-card-intent`, { amount: chargeAmount, currency: "aed" });
      if (!res.data.success) { toast.error(res.data.message || `Failed to charge ${label}`); return; }

      const { error, paymentIntent } = await stripe.confirmCardPayment(res.data.clientSecret, { payment_method: { card } });
      if (error) { toast.error(`${label}: ${error.message || "Payment failed"}`); return; }
      if (paymentIntent.status !== "succeeded") { toast.error(`${label} did not complete`); return; }

      const updatedPaid = { ...paidAmounts, [key]: Number((alreadyPaid + chargeAmount).toFixed(2)) };
      setPaidAmounts(updatedPaid);
      card.clear();
      setCardReady(false);

      // auto-advance activeKey to next unpaid card
      const nextUnpaid = activeCardKeys.find((k) => k !== key && amountValue(cardAmounts[k]) > Number(updatedPaid[k] || 0));
      if (nextUnpaid) setActiveKey(nextUnpaid);

      const updatedPaidTotal = cardKeys.reduce((s, k) => s + Number(updatedPaid[k] || 0), 0);
      const updatedCash = Math.max(total - updatedPaidTotal, 0);
      toast.success(`${label} charged ${currency}${chargeAmount.toFixed(2)} ✓`);
      onComplete && onComplete({ paidCardAmount: updatedPaidTotal, plannedCardAmount, cashAmount: updatedCash, plannedCashAmount, paidAmounts: updatedPaid });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
      setProcessingKey("");
    }
  };

  const allCardsPaid = isValidCardSplit && paidCardAmount >= plannedCardAmount && plannedCardAmount > 0;

  return (
    <div className="po-card sp-wrap" style={{ marginTop: 16 }}>
      <h3 className="po-card-title sp-title">Split Payment</h3>
      <p className="sp-total-line">Total: <strong>{currency}{total.toFixed(2)}</strong></p>

      {/* Per-card rows */}
      {activeCardKeys.map((key, idx) => {
        const isPaid = Number(paidAmounts[key] || 0) >= amountValue(cardAmounts[key]) && amountValue(cardAmounts[key]) > 0;
        const isActive = activeKey === key;
        return (
          <div key={key} className={`sp-card-row${isActive ? " sp-card-row-active" : ""}${isPaid ? " sp-card-row-paid" : ""}`}>
            <div className="sp-card-row-header">
              <span className="sp-card-label">
                {isPaid ? "✓ " : ""}Card {idx + 1}
                {isPaid && <span className="sp-paid-badge"> paid</span>}
              </span>
              {!isPaid && (
                <button type="button" className="sp-select-btn" onClick={() => { setActiveKey(key); setCardReady(false); elements?.getElement(CardElement)?.clear(); }}>
                  {isActive ? "Selected" : "Use this card"}
                </button>
              )}
            </div>
            <div className="po-field" style={{ marginBottom: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder={`Amount for Card ${idx + 1}`}
                value={cardAmounts[key]}
                disabled={isPaid}
                onChange={(e) => setCardAmount(key, e.target.value)}
                onFocus={(e) => { const v = e.target.value; if (!v || v === "0") setCardAmount(key, ""); setActiveKey(key); }}
              />
            </div>
            {isActive && !isPaid && (
              <>
                <p className="sp-enter-hint">Enter card details below and click "Charge Card {idx + 1}"</p>
                <button
                  type="button"
                  className="sp-pay-chip"
                  disabled={loading || amountValue(cardAmounts[key]) <= Number(paidAmounts[key] || 0)}
                  onClick={() => paySingleCard(key, `Card ${idx + 1}`)}
                >
                  {processingKey === key ? `Charging Card ${idx + 1}...` : `Charge Card ${idx + 1} — ${currency}${Math.max(amountValue(cardAmounts[key]) - Number(paidAmounts[key] || 0), 0).toFixed(2)}`}
                </button>
              </>
            )}
          </div>
        );
      })}

      {/* Shared card element — one physical card entered at a time */}
      <div className="sp-card-field-wrap" style={{ marginTop: 8 }}>
        <p className="sp-enter-hint" style={{ marginBottom: 8 }}>
          {allCardsPaid ? "All cards charged ✓" : `Card details for Card ${activeCardKeys.indexOf(activeKey) + 1}`}
        </p>
        <CardElement options={cardElementStyle} onChange={(e) => setCardReady(!!e.complete)} />
      </div>

      {/* Add / remove */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {visibleCards < 3 && (
          <button type="button" className="sp-chip-btn" onClick={addCard}>+ Add another card</button>
        )}
        {visibleCards > 1 && (
          <button type="button" className="sp-chip-btn sp-chip-btn-muted" onClick={removeLastCard}>Remove Card {visibleCards}</button>
        )}
      </div>

      {/* Summary */}
      <div className="sp-summary-row" style={{ marginTop: 14 }}>
        <span>Cards planned</span><strong>{currency}{plannedCardAmount.toFixed(2)}</strong>
      </div>
      <div className="sp-summary-row">
        <span>Cards paid</span><strong>{currency}{paidCardAmount.toFixed(2)}</strong>
      </div>
      <div className="sp-summary-row">
        <span>Cash at door</span><strong>{currency}{plannedCashAmount.toFixed(2)}</strong>
      </div>

      {allCardsPaid && (
        <p className="sp-ready-msg">All cards charged — click "Place Split Order" to confirm.</p>
      )}
    </div>
  );
}

