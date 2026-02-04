import { useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";

interface CardEntryScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  amount: number;
  gftAmount: number;
}

const ELEMENT_STYLES = {
  style: {
    base: {
      color: "#fff",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: "16px",
      fontWeight: "400",
      "::placeholder": {
        color: "#64748b",
      },
    },
    invalid: {
      color: "#ef4444",
    },
  },
};

function CardForm({ onBack, onSuccess, amount, gftAmount }: CardEntryScreenProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [cardholderName, setCardholderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/gf/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gbpAmount: amount }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create payment");
      }

      const { clientSecret, orderId } = await response.json();

      const cardNumber = elements.getElement(CardNumberElement);
      if (!cardNumber) throw new Error("Card element not found");

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumber,
            billing_details: {
              name: cardholderName || undefined,
            },
          },
        }
      );

      if (stripeError) {
        if (stripeError.type === "card_error" || stripeError.type === "validation_error") {
          throw new Error(stripeError.message || "Your card was declined");
        }
        throw new Error(stripeError.message || "Payment failed");
      }

      if (!paymentIntent) {
        throw new Error("Payment could not be processed");
      }

      switch (paymentIntent.status) {
        case "succeeded":
          toast({
            title: "Payment successful!",
            description: `You will receive ${gftAmount.toLocaleString()} GFT`,
          });
          onSuccess();
          break;
        case "processing":
          toast({
            title: "Payment processing",
            description: "Your payment is being processed. You'll be notified when complete.",
          });
          onSuccess();
          break;
        case "requires_action":
          throw new Error("Authentication was cancelled or failed. Please try again.");
        case "requires_payment_method":
          throw new Error("Payment failed. Please try a different card.");
        default:
          throw new Error("Unexpected payment status. Please contact support.");
      }
    } catch (err: any) {
      setError(err.message || "Payment failed");
      toast({
        title: "Payment failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col font-['Plus_Jakarta_Sans']"
      style={{ background: "#020617" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-center px-6 pt-12 pb-6"
        style={{ borderBottom: "1px solid rgba(30, 41, 59, 0.3)" }}
      >
        <div className="flex items-center justify-between w-full max-w-[430px] md:max-w-[600px] lg:max-w-[800px]">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-slate-700"
            style={{ background: "#1e293b", border: "1px solid #1e293b" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 12H4M4 12L10 6M4 12L10 18"
                stroke="#F8FAFC"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <span className="text-xl font-bold" style={{ color: "#fff" }}>
            Card Details
          </span>

          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 px-6 py-8 max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full">
          {/* Secure Payment Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.50016 6.70337V5.33337C3.50016 2.84809 5.51488 0.833374 8.00016 0.833374C10.4854 0.833374 12.5002 2.84809 12.5002 5.33337V6.70337C13.2435 6.75871 13.7268 6.89871 14.0808 7.25271C14.6668 7.83804 14.6668 8.78137 14.6668 10.6667C14.6668 12.552 14.6668 13.4954 14.0808 14.0807C13.4955 14.6667 12.5522 14.6667 10.6668 14.6667H5.3335C3.44816 14.6667 2.50483 14.6667 1.9195 14.0807C1.3335 13.4954 1.3335 12.552 1.3335 10.6667C1.3335 8.78137 1.3335 7.83804 1.9195 7.25271C2.27283 6.89871 2.75683 6.75871 3.50016 6.70337Z"
                  fill="#4ADE80"
                />
              </svg>
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: "#4ade80", letterSpacing: "0.5px" }}
              >
                Secure Payment
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Enter your card information
            </h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Transaction is encrypted and secured.
            </p>
          </div>

          {/* Card Fields */}
          <div className="space-y-6">
            {/* Cardholder Name */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase mb-3"
                style={{ color: "#94a3b8", letterSpacing: "0.5px" }}
              >
                Cardholder Name (Optional)
              </label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-4 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{
                  background: "#1e293b",
                  border: "1px solid rgba(30, 41, 59, 0.5)",
                }}
              />
            </div>

            {/* Card Number */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase mb-3"
                style={{ color: "#94a3b8", letterSpacing: "0.5px" }}
              >
                Card Number
              </label>
              <div
                className="w-full px-4 py-4 rounded-2xl"
                style={{
                  background: "#1e293b",
                  border: "1px solid rgba(30, 41, 59, 0.5)",
                }}
              >
                <CardNumberElement options={ELEMENT_STYLES} />
              </div>
            </div>

            {/* Expiry and CVC */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label
                  className="block text-[10px] font-bold uppercase mb-3"
                  style={{ color: "#94a3b8", letterSpacing: "0.5px" }}
                >
                  Expiry Date
                </label>
                <div
                  className="w-full px-4 py-4 rounded-2xl"
                  style={{
                    background: "#1e293b",
                    border: "1px solid rgba(30, 41, 59, 0.5)",
                  }}
                >
                  <CardExpiryElement options={ELEMENT_STYLES} />
                </div>
              </div>
              <div className="flex-1">
                <label
                  className="block text-[10px] font-bold uppercase mb-3"
                  style={{ color: "#94a3b8", letterSpacing: "0.5px" }}
                >
                  CVC
                </label>
                <div
                  className="w-full px-4 py-4 rounded-2xl"
                  style={{
                    background: "#1e293b",
                    border: "1px solid rgba(30, 41, 59, 0.5)",
                  }}
                >
                  <CardCvcElement options={ELEMENT_STYLES} />
                </div>
              </div>
            </div>

            {/* Save Card Toggle - Coming Soon */}
            <div
              className="flex items-center justify-between p-4 rounded-2xl opacity-60"
              style={{
                background: "rgba(30, 41, 59, 0.3)",
                border: "1px solid rgba(30, 41, 59, 0.3)",
              }}
            >
              <div>
                <p className="text-sm text-white font-medium mb-1">
                  Save card for future payments
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    Coming Soon
                  </span>
                </p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>
                  Checkout faster next time you buy GFT.
                </p>
              </div>
              <div
                className="w-12 h-6 rounded-full p-1 cursor-not-allowed"
                style={{ background: "#1e293b" }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ background: "#64748b" }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 pb-24 pt-6"
          style={{
            background: "#020617",
            borderTop: "1px solid rgba(30, 41, 59, 0.3)",
          }}
        >
          <div className="max-w-[430px] md:max-w-[600px] lg:max-w-[800px] mx-auto w-full flex flex-col gap-6">
            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
                  Total to Pay
                </p>
                <p className="text-xs font-bold" style={{ color: "#4ade80" }}>
                  Includes all taxes
                </p>
              </div>
              <span className="text-3xl font-bold text-white">
                £{amount.toFixed(2)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || !stripe}
              className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "#4ade80",
                boxShadow: "0 0 30px -10px #4ade80",
              }}
            >
              <span style={{ color: "#022c22" }}>
                {isProcessing ? "Processing..." : "Confirm & Pay"}
              </span>
              {!isProcessing && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3.3335 9.99999H16.6668M16.6668 9.99999L11.6668 5M16.6668 9.99999L11.6668 15"
                    stroke="#022C22"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CardEntryScreen(props: CardEntryScreenProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    fetch("/api/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      })
      .catch(console.error);
  }, []);

  if (!stripePromise) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center"
        style={{ background: "#020617" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading payment form...</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardForm {...props} />
    </Elements>
  );
}
