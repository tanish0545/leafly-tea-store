/**
 * Leafly Authentication & Input Validation Utilities
 */

import type { Order } from "../types/contracts";

export const GMAIL_ERROR_MESSAGE = "Please use a valid Gmail address ending with @gmail.com.";

/**
 * Validates that an email address has a valid local username and ends exactly with @gmail.com.
 * Trims leading/trailing whitespace and is strictly case-insensitive.
 */
export function isValidGmailAddress(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
  return gmailRegex.test(trimmed);
}

/**
 * Validates that an email address has a valid standard format.
 * Trims leading/trailing whitespace and is strictly case-insensitive.
 */
export function isValidEmailAddress(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

// ==========================================
// PHONE NUMBER VALIDATION RULES
// ==========================================

export interface PhoneValidationRule {
  countryCode: string; // ISO 2-letter
  dialCode: string;
  minDigits: number;
  maxDigits: number;
  pattern?: RegExp;
  example: string;
  errorMessage: string;
}

const COUNTRY_PHONE_RULES: Record<string, PhoneValidationRule> = {
  in: {
    countryCode: "IN",
    dialCode: "+91",
    minDigits: 10,
    maxDigits: 10,
    pattern: /^[6-9]\d{9}$/,
    example: "9876543210",
    errorMessage: "Please enter a valid 10-digit mobile number.",
  },
  us: {
    countryCode: "US",
    dialCode: "+1",
    minDigits: 10,
    maxDigits: 10,
    pattern: /^[2-9]\d{9}$/,
    example: "2025550143",
    errorMessage: "Please enter a valid 10-digit phone number.",
  },
  ca: {
    countryCode: "CA",
    dialCode: "+1",
    minDigits: 10,
    maxDigits: 10,
    pattern: /^[2-9]\d{9}$/,
    example: "4165550143",
    errorMessage: "Please enter a valid 10-digit phone number.",
  },
  gb: {
    countryCode: "GB",
    dialCode: "+44",
    minDigits: 10,
    maxDigits: 11,
    pattern: /^[1-9]\d{9,10}$/,
    example: "7911123456",
    errorMessage: "Please enter a valid UK phone number (10-11 digits).",
  },
  ae: {
    countryCode: "AE",
    dialCode: "+971",
    minDigits: 9,
    maxDigits: 9,
    pattern: /^[1-9]\d{8}$/,
    example: "501234567",
    errorMessage: "Please enter a valid 9-digit UAE phone number.",
  },
  au: {
    countryCode: "AU",
    dialCode: "+61",
    minDigits: 9,
    maxDigits: 9,
    pattern: /^[4-9]\d{8}$/,
    example: "412345678",
    errorMessage: "Please enter a valid 9-digit Australian phone number.",
  },
  sg: {
    countryCode: "SG",
    dialCode: "+65",
    minDigits: 8,
    maxDigits: 8,
    pattern: /^[689]\d{7}$/,
    example: "81234567",
    errorMessage: "Please enter a valid 8-digit Singapore phone number.",
  },
  de: {
    countryCode: "DE",
    dialCode: "+49",
    minDigits: 10,
    maxDigits: 11,
    example: "15123456789",
    errorMessage: "Please enter a valid German phone number (10-11 digits).",
  },
  fr: {
    countryCode: "FR",
    dialCode: "+33",
    minDigits: 9,
    maxDigits: 9,
    example: "612345678",
    errorMessage: "Please enter a valid French phone number (9 digits).",
  },
  jp: {
    countryCode: "JP",
    dialCode: "+81",
    minDigits: 10,
    maxDigits: 10,
    example: "9012345678",
    errorMessage: "Please enter a valid Japanese phone number (10 digits).",
  },
};

const DEFAULT_RULE: PhoneValidationRule = {
  countryCode: "OTHER",
  dialCode: "",
  minDigits: 7,
  maxDigits: 15,
  example: "9876543210",
  errorMessage: "Please enter a valid phone number (7-15 digits).",
};

/**
 * Resolves standard PhoneValidationRule by country name, ISO code, or dial code.
 */
export function getPhoneValidationRule(countryNameOrCode?: string): PhoneValidationRule {
  if (!countryNameOrCode) return COUNTRY_PHONE_RULES.in;
  const norm = countryNameOrCode.trim().toLowerCase();

  if (norm === "india" || norm === "in" || norm === "+91" || norm === "91") {
    return COUNTRY_PHONE_RULES.in;
  }
  if (norm === "united states" || norm === "us" || norm === "usa" || norm === "+1" || norm === "1") {
    return COUNTRY_PHONE_RULES.us;
  }
  if (norm === "canada" || norm === "ca") {
    return COUNTRY_PHONE_RULES.ca;
  }
  if (norm === "united kingdom" || norm === "gb" || norm === "uk" || norm === "+44" || norm === "44") {
    return COUNTRY_PHONE_RULES.gb;
  }
  if (norm === "united arab emirates" || norm === "ae" || norm === "uae" || norm === "+971" || norm === "971") {
    return COUNTRY_PHONE_RULES.ae;
  }
  if (norm === "australia" || norm === "au" || norm === "+61" || norm === "61") {
    return COUNTRY_PHONE_RULES.au;
  }
  if (norm === "singapore" || norm === "sg" || norm === "+65" || norm === "65") {
    return COUNTRY_PHONE_RULES.sg;
  }
  if (norm === "germany" || norm === "de" || norm === "+49" || norm === "49") {
    return COUNTRY_PHONE_RULES.de;
  }
  if (norm === "france" || norm === "fr" || norm === "+33" || norm === "33") {
    return COUNTRY_PHONE_RULES.fr;
  }
  if (norm === "japan" || norm === "jp" || norm === "+81" || norm === "81") {
    return COUNTRY_PHONE_RULES.jp;
  }

  // Check direct ISO key
  if (COUNTRY_PHONE_RULES[norm]) {
    return COUNTRY_PHONE_RULES[norm];
  }

  return DEFAULT_RULE;
}

/**
 * Returns the international dial code for a country (e.g. "+91" for India)
 */
export function getDialCodeForCountry(countryNameOrCode?: string): string {
  const rule = getPhoneValidationRule(countryNameOrCode);
  return rule.dialCode || "+91";
}

/**
 * Extracts pure national phone digits by stripping dial code and non-numeric characters.
 */
export function extractNationalPhoneDigits(phone: string | null | undefined, countryDialCode?: string): string {
  if (!phone) return "";
  let clean = phone.trim();
  const dial = countryDialCode?.trim() || "";

  if (dial && clean.startsWith(dial)) {
    clean = clean.slice(dial.length).trim();
  } else if (clean.startsWith("+")) {
    // If phone starts with some other dial code (+XX), strip until first space or non-digit
    const spaceIdx = clean.indexOf(" ");
    if (spaceIdx > 0 && spaceIdx <= 5) {
      clean = clean.slice(spaceIdx).trim();
    }
  }

  return clean.replace(/\D/g, "");
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  nationalDigits: string;
  dialCode: string;
  formatted: string;
}

/**
 * Validates a phone number reactively based on selected country rules.
 */
export function validatePhoneNumber(
  phone: string | null | undefined,
  countryNameOrCode: string = "India"
): PhoneValidationResult {
  const rule = getPhoneValidationRule(countryNameOrCode);
  const dialCode = rule.dialCode || getDialCodeForCountry(countryNameOrCode);

  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      error: "Phone number is required.",
      nationalDigits: "",
      dialCode,
      formatted: "",
    };
  }

  const digits = extractNationalPhoneDigits(phone, dialCode);

  if (!digits) {
    return {
      isValid: false,
      error: "Phone number is required.",
      nationalDigits: "",
      dialCode,
      formatted: "",
    };
  }

  if (digits.length < rule.minDigits) {
    return {
      isValid: false,
      error: rule.errorMessage,
      nationalDigits: digits,
      dialCode,
      formatted: `${dialCode} ${digits}`,
    };
  }

  if (digits.length > rule.maxDigits) {
    return {
      isValid: false,
      error: rule.errorMessage,
      nationalDigits: digits,
      dialCode,
      formatted: `${dialCode} ${digits}`,
    };
  }

  if (rule.pattern && !rule.pattern.test(digits)) {
    return {
      isValid: false,
      error: rule.errorMessage,
      nationalDigits: digits,
      dialCode,
      formatted: `${dialCode} ${digits}`,
    };
  }

  return {
    isValid: true,
    error: undefined,
    nationalDigits: digits,
    dialCode,
    formatted: `${dialCode} ${digits}`,
  };
}

// ==========================================
// FIRST-ORDER COUPON ELIGIBILITY
// ==========================================

export const FIRST_ORDER_COUPON_CODES = [
  "LEAFLY10",
  "FIRST10",
  "FIRST50",
  "WELCOME",
  "WELCOME10",
  "FIRSTORDER",
];

/**
 * Checks whether a given coupon code is a first-order / welcome voucher.
 */
export function isFirstOrderCouponCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return FIRST_ORDER_COUPON_CODES.includes(code.trim().toUpperCase());
}

/**
 * Checks whether a customer is eligible for a first-order coupon based on their placed orders.
 * Returns true if customer has 0 successfully placed, non-cancelled orders.
 */
export function isFirstOrderEligible(orders: Order[] | null | undefined): boolean {
  if (!orders || orders.length === 0) return true;
  const placedNonCancelledOrders = orders.filter(
    (o) => o.status !== "Cancelled" && o.orderStatus !== "Cancelled"
  );
  return placedNonCancelledOrders.length === 0;
}
