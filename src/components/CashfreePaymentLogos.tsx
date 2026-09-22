import React from "react";
import "./CashfreePaymentLogos.css";

export const CashfreePaymentLogos: React.FC = () => {
  return (
    <div className="cf-payment-logos-wrapper" aria-label="Supported Payment Methods">
      {/* 1. UPI Payment Apps & UPI ID */}
      <div className="cf-methods-group">
        <span className="cf-group-label">UPI</span>
        <div className="cf-group-pills">
          {/* Google Pay */}
          <span className="cf-logo-pill cf-pill-gpay" title="Google Pay (UPI)">
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="cf-svg-icon">
              <path fill="#4285F4" d="M15.68 8.18c0-.57-.05-1.12-.15-1.64H8v3.1h4.31c-.19 1-.76 1.85-1.61 2.42v2.01h2.6c1.52-1.4 2.38-3.46 2.38-5.89z" />
              <path fill="#34A853" d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.64.77-2.7.77-2.08 0-3.84-1.4-4.47-3.29H.81v2.08C2.14 14.23 4.86 16 8 16z" />
              <path fill="#FBBC05" d="M3.53 9.53c-.16-.48-.25-.99-.25-1.53s.09-1.05.25-1.53V4.39H.81C.29 5.42 0 6.67 0 8s.29 2.58.81 3.61l2.72-2.08z" />
              <path fill="#EA4335" d="M8 3.18c1.17 0 2.23.4 3.06 1.19l2.3-2.3C11.97.77 10.16 0 8 0 4.86 0 2.14 1.77.81 4.39l2.72 2.08c.63-1.89 2.39-3.29 4.47-3.29z" />
            </svg>
            <span className="cf-pill-text">Google Pay</span>
          </span>

          {/* PhonePe */}
          <span className="cf-logo-pill cf-pill-phonepe" title="PhonePe (UPI)">
            <span className="cf-phonepe-glyph" aria-hidden="true">पे</span>
            <span className="cf-pill-text">PhonePe</span>
          </span>

          {/* Paytm */}
          <span className="cf-logo-pill cf-pill-paytm" title="Paytm (UPI)">
            <span className="cf-paytm-wordmark" aria-hidden="true">
              <span className="cf-paytm-pay">Pay</span>
              <span className="cf-paytm-tm">tm</span>
            </span>
          </span>

          {/* BHIM */}
          <span className="cf-logo-pill cf-pill-bhim" title="BHIM UPI">
            <span className="cf-bhim-triangles" aria-hidden="true">
              <span className="cf-bhim-t1" />
              <span className="cf-bhim-t2" />
            </span>
            <span className="cf-pill-text">BHIM</span>
          </span>

          {/* Amazon Pay */}
          <span className="cf-logo-pill cf-pill-amazon" title="Amazon Pay (UPI)">
            <span className="cf-amazon-badge" aria-hidden="true">
              <span className="cf-amazon-a">amazon</span>
              <span className="cf-amazon-pay">pay</span>
            </span>
          </span>

          {/* UPI ID / VPA & Other Apps */}
          <span className="cf-logo-pill cf-pill-upi-id" title="Pay using any UPI ID / VPA or other UPI app">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#097939" strokeWidth="2.2" aria-hidden="true" className="cf-svg-icon">
              <circle cx="12" cy="12" r="4" />
              <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
            </svg>
            <span className="cf-pill-text">UPI ID / Other</span>
          </span>
        </div>
      </div>

      {/* 2. Cards (Visa, Mastercard, RuPay) */}
      <div className="cf-methods-group">
        <span className="cf-group-label">Cards</span>
        <div className="cf-group-pills">
          {/* Visa */}
          <span className="cf-logo-pill cf-pill-visa" title="Visa Credit and Debit Cards">
            <span className="cf-brand-visa" aria-hidden="true">VISA</span>
          </span>

          {/* Mastercard */}
          <span className="cf-logo-pill cf-pill-mastercard" title="Mastercard Credit and Debit Cards">
            <span className="cf-mastercard-circles" aria-hidden="true">
              <span className="cf-mc-circle cf-mc-red" />
              <span className="cf-mc-circle cf-mc-yellow" />
            </span>
            <span className="cf-pill-text">Mastercard</span>
          </span>

          {/* RuPay */}
          <span className="cf-logo-pill cf-pill-rupay" title="RuPay Debit and Credit Cards">
            <span className="cf-rupay-mark" aria-hidden="true">
              <span className="cf-rupay-arrow" />
              <span className="cf-rupay-text">RuPay</span>
            </span>
          </span>
        </div>
      </div>

      {/* 3. Net Banking */}
      <div className="cf-methods-group">
        <span className="cf-group-label">Net Banking</span>
        <div className="cf-group-pills">
          <span className="cf-logo-pill cf-pill-bank" title="State Bank of India">
            <span className="cf-bank-dot sbi" />
            <span className="cf-pill-text">SBI</span>
          </span>
          <span className="cf-logo-pill cf-pill-bank" title="HDFC Bank">
            <span className="cf-bank-dot hdfc" />
            <span className="cf-pill-text">HDFC</span>
          </span>
          <span className="cf-logo-pill cf-pill-bank" title="ICICI Bank">
            <span className="cf-bank-dot icici" />
            <span className="cf-pill-text">ICICI</span>
          </span>
          <span className="cf-logo-pill cf-pill-bank" title="Axis Bank">
            <span className="cf-bank-dot axis" />
            <span className="cf-pill-text">Axis</span>
          </span>
          <span className="cf-logo-pill cf-pill-bank" title="Kotak Mahindra Bank">
            <span className="cf-bank-dot kotak" />
            <span className="cf-pill-text">Kotak</span>
          </span>
          <span className="cf-logo-pill cf-pill-bank cf-pill-more-banks" title="50+ Net Banking Partners supported">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="cf-svg-icon">
              <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 3l9 7H3z" />
            </svg>
            <span className="cf-pill-text">+50 Banks</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CashfreePaymentLogos;
