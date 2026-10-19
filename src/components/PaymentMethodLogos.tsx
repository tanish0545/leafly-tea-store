import React from "react";
import "./PaymentMethodLogos.css";

export const PaymentMethodLogos: React.FC = () => {
  return (
    <div className="payment-logos-wrapper" aria-label="Supported Payment Methods via Razorpay">
      {/* 1. UPI Payment Apps & UPI ID */}
      <div className="payment-methods-group">
        <span className="payment-group-label">UPI</span>
        <div className="payment-group-pills">
          {/* Google Pay */}
          <span className="payment-logo-pill" title="Google Pay (UPI)">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="payment-svg-icon">
              <path fill="#4285F4" d="M15.68 8.18c0-.57-.05-1.12-.15-1.64H8v3.1h4.31c-.19 1-.76 1.85-1.61 2.42v2.01h2.6c1.52-1.4 2.38-3.46 2.38-5.89z" />
              <path fill="#34A853" d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.64.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H.81v2.08C2.14 14.23 4.86 16 8 16z" />
              <path fill="#FBBC05" d="M3.53 9.53c-.16-.48-.25-.99-.25-1.53s.09-1.05.25-1.53V4.39H.81C.29 5.42 0 6.67 0 8s.29 2.58.81 3.61l2.72-2.08z" />
              <path fill="#EA4335" d="M8 3.18c1.17 0 2.23.4 3.06 1.19l2.3-2.3C11.97.77 10.16 0 8 0 4.86 0 2.14 1.77.81 4.39l2.72 2.08c.63-1.89 2.39-3.29 4.47-3.29z" />
            </svg>
            <span className="payment-pill-text">Google Pay</span>
          </span>

          {/* PhonePe */}
          <span className="payment-logo-pill" title="PhonePe (UPI)">
            <span className="payment-phonepe-glyph" aria-hidden="true">पे</span>
            <span className="payment-pill-text">PhonePe</span>
          </span>

          {/* Paytm */}
          <span className="payment-logo-pill" title="Paytm (UPI)">
            <span className="payment-paytm-wordmark" aria-hidden="true">
              <span className="payment-paytm-pay">Pay</span>
              <span className="payment-paytm-tm">tm</span>
            </span>
          </span>

          {/* BHIM */}
          <span className="payment-logo-pill" title="BHIM UPI">
            <span className="payment-bhim-triangles" aria-hidden="true">
              <span className="payment-bhim-t1" />
              <span className="payment-bhim-t2" />
            </span>
            <span className="payment-pill-text">BHIM</span>
          </span>

          {/* Amazon Pay */}
          <span className="payment-logo-pill" title="Amazon Pay (UPI)">
            <span className="payment-amazon-badge" aria-hidden="true">
              <span className="payment-amazon-a">amazon</span>
              <span className="payment-amazon-pay">pay</span>
            </span>
          </span>

          {/* UPI ID / QR / Any UPI App */}
          <span className="payment-logo-pill" title="Pay using any UPI ID or scan QR code">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#097939" strokeWidth="2.2" aria-hidden="true" className="payment-svg-icon">
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
            </svg>
            <span className="payment-pill-text">UPI ID / QR</span>
          </span>
        </div>
      </div>

      {/* 2. Cards (Visa, Mastercard, RuPay) */}
      <div className="payment-methods-group">
        <span className="payment-group-label">Cards</span>
        <div className="payment-group-pills">
          <span className="payment-logo-pill" title="Visa Credit and Debit Cards">
            <span className="payment-brand-visa" aria-hidden="true">VISA</span>
          </span>

          <span className="payment-logo-pill" title="Mastercard Credit and Debit Cards">
            <span className="payment-mastercard-circles" aria-hidden="true">
              <span className="payment-mc-circle payment-mc-red" />
              <span className="payment-mc-circle payment-mc-yellow" />
            </span>
            <span className="payment-pill-text">Mastercard</span>
          </span>

          <span className="payment-logo-pill" title="RuPay Debit and Credit Cards">
            <span className="payment-rupay-mark" aria-hidden="true">
              <span className="payment-rupay-arrow" />
              <span className="payment-rupay-text">RuPay</span>
            </span>
          </span>
        </div>
      </div>

      {/* 3. Net Banking */}
      <div className="payment-methods-group">
        <span className="payment-group-label">Net Banking</span>
        <div className="payment-group-pills">
          <span className="payment-logo-pill" title="State Bank of India">
            <span className="payment-bank-dot sbi" />
            <span className="payment-pill-text">SBI</span>
          </span>
          <span className="payment-logo-pill" title="HDFC Bank">
            <span className="payment-bank-dot hdfc" />
            <span className="payment-pill-text">HDFC</span>
          </span>
          <span className="payment-logo-pill" title="ICICI Bank">
            <span className="payment-bank-dot icici" />
            <span className="payment-pill-text">ICICI</span>
          </span>
          <span className="payment-logo-pill" title="Axis Bank">
            <span className="payment-bank-dot axis" />
            <span className="payment-pill-text">Axis</span>
          </span>
          <span className="payment-logo-pill" title="Kotak Mahindra Bank">
            <span className="payment-bank-dot kotak" />
            <span className="payment-pill-text">Kotak</span>
          </span>
          <span className="payment-logo-pill payment-pill-more-banks" title="50+ Net Banking Partners supported">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="payment-svg-icon">
              <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 3l9 7H3z" />
            </svg>
            <span className="payment-pill-text">+50 Banks</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodLogos;
