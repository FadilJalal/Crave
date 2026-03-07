import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import axios from "axios";
import { toast } from "react-toastify";

const cardElementStyle = {
  style: {
    base: {
      fontSize: "16px",
      color: "#111827",
      "::placeholder": { color: "#9ca3af" },
    },
  },
};

export default function SplitPayment({ total, apiBaseUrl, currency = "AED", onComplete }) {
  const stripe = useStripe();
  const elements = useElements();

  const [cardAmount, setCardAmount] = useState(total / 2);
  const [loading, setLoading] = useState(false);

  const cashAmount = Math.max(total - Number(cardAmount || 0), 0);
  const isValidCardAmount = cardAmount > 0 && cardAmount < total;

  const startCardPayment = async () => {
    if (!isValidCardAmount) {
      toast.error("Card amount must be greater than 0 and less than total.");
      return;
    }
    if (!stripe || !elements) {
      toast.error("Stripe is not ready yet.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${apiBaseUrl}/api/payment/create-card-intent`, {
        amount: Number(cardAmount),
        currency: "aed",
      });

      if (!res.data.success) {
        toast.error(res.data.message || "Failed to create card payment");
        return;
      }

      const clientSecret = res.data.clientSecret;
      const card = elements.getElement(CardElement);

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        return;
      }

      if (paymentIntent.status === "succeeded") {
        toast.success(
          `Card payment of ${currency}${Number(cardAmount).toFixed(
            2
          )} succeeded. Remaining ${currency}${cashAmount.toFixed(2)} to be paid in cash.`
        );
        onComplete && onComplete({ paymentIntent, cardAmount: Number(cardAmount), cashAmount });
      } else {
        toast.error("Payment did not complete");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="po-card" style={{ marginTop: 16 }}>
      <h3 className="po-card-title">Card + Cash Split</h3>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
        Total:{" "}
        <strong>
          {currency}
          {total.toFixed(2)}
        </strong>
      </p>

      <div className="po-field" style={{ marginBottom: 12 }}>
        <label>Amount to pay by card now</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={cardAmount}
          onChange={(e) => setCardAmount(Number(e.target.value) || 0)}
        />
      </div>

      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
        You will pay{" "}
        <strong>
          {currency}
          {cashAmount.toFixed(2)}
        </strong>{" "}
        in cash on delivery.
      </p>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <CardElement options={cardElementStyle} />
      </div>

      <button
        type="button"
        className="po-submit"
        onClick={startCardPayment}
        disabled={loading || !isValidCardAmount}
      >
        {loading
          ? "Processing..."
          : `Pay ${currency}${Number(cardAmount).toFixed(2)} by Card`}
      </button>
    </div>
  );
}

