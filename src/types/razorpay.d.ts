/**
 * Leafly — Type declarations for Razorpay Standard Checkout SDK (checkout.js)
 * Script loaded via: <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 */

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
  method?: string;
}

export interface RazorpayTheme {
  color?: string;
  backdrop_color?: string;
  hide_topbar?: boolean;
}

export interface RazorpayModalOptions {
  backdropclose?: boolean;
  escape?: boolean;
  handleback?: boolean;
  confirm_close?: boolean;
  ondismiss?: () => void;
  animation?: boolean;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler?: (response: RazorpaySuccessResponse) => void | Promise<void>;
  prefill?: RazorpayPrefill;
  notes?: Record<string, string>;
  theme?: RazorpayTheme;
  modal?: RazorpayModalOptions;
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  timeout?: number;
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed" | string, handler: (response: RazorpayErrorResponse) => void) => void;
  close: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
