/**
 * Cambodian Bakong & Mobile Banking KHQR Payment Slip Parser
 * Specifically optimized for:
 * - ABA Mobile (KHQR, Transfer, PayWay)
 * - Bakong (NBC KHQR Payment Vouchers)
 * - Wing Bank (WingPay, Transfer)
 * - ACLEDA Mobile (KHQR Scan, Account Transfer)
 * - TrueMoney & General Local Payment Slips
 */

import { toMinorUnits } from "@/lib/money";
import { type AvailableCategory, matchReceiptCategory } from "./categories";

export type DetectedBank =
  | "ABA Mobile"
  | "Bakong"
  | "Wing Bank"
  | "ACLEDA Mobile"
  | "TrueMoney"
  | "Canadia Bank"
  | "Sathapana Bank"
  | "Bank Transfer";

export interface KhqrSlipResult {
  isSlip: boolean;
  bankName?: DetectedBank;
  amount: number;
  amountMinor: bigint;
  currency: "USD" | "KHR";
  merchant: string;
  transactionId?: string;
  dateTime?: string;
  category: string;
  categoryId?: string;
  confidence: number;
  rawText?: string;
}

/**
 * Bank detection regexes
 */
const BANK_SIGNATURES: Array<{ name: DetectedBank; regex: RegExp }> = [
  { name: "ABA Mobile", regex: /\b(aba\s*mobile|aba\s*bank|advanced\s*bank\s*of\s*asia|payway)\b/i },
  { name: "Bakong", regex: /\b(bakong|khqr|national\s*bank\s*of\s*cambodia|nbc)\b/i },
  { name: "Wing Bank", regex: /\b(wing\s*bank|wing\s*mobile|wingpay|wing\s*money)\b/i },
  { name: "ACLEDA Mobile", regex: /\b(acleda\s*mobile|acleda\s*bank|acleda)\b/i },
  { name: "TrueMoney", regex: /\b(truemoney|true\s*money)\b/i },
  { name: "Canadia Bank", regex: /\b(canadia\s*bank|canadia)\b/i },
  { name: "Sathapana Bank", regex: /\b(sathapana\s*mobile|sathapana)\b/i },
];

/**
 * Parses raw text from a screenshot or voucher into structured payment data
 */
export function parseKhqrBankingSlip(
  rawText: string,
  availableCategories: AvailableCategory[] = []
): KhqrSlipResult {
  if (!rawText || !rawText.trim()) {
    return {
      isSlip: false,
      amount: 0,
      amountMinor: 0n,
      currency: "USD",
      merchant: "Payment",
      category: "General",
      confidence: 0,
    };
  }

  const cleanText = rawText.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Detect Bank
  let detectedBank: DetectedBank | undefined;
  for (const sig of BANK_SIGNATURES) {
    if (sig.regex.test(cleanText)) {
      detectedBank = sig.name;
      break;
    }
  }

  // Check if text looks like a banking slip or KHQR voucher
  const slipKeywords = [
    "successful", "success", "payment", "transfer", "transaction",
    "completed", "paid to", "receiver", "beneficiary", "khqr",
    "txn id", "ref no", "reference", "ជោគជ័យ", "ផ្ទេរប្រាក់", "ទឹកប្រាក់"
  ];

  const hasSlipSignals =
    Boolean(detectedBank) ||
    slipKeywords.filter((kw) => lowerText.includes(kw)).length >= 2;

  // 2. Detect Currency (USD vs KHR)
  // Riel markers: ៛, KHR, riel, រៀល
  const isKhr =
    /(?:៛|\bkhr\b|\briel\b|រៀល)/i.test(cleanText) ||
    // Heuristic: amounts without decimals that are >= 1000 usually indicate KHR in Cambodia
    (/\b(?:[1-9]\d{0,2}(?:,\d{3})+|\d{4,})\s*(?:khr|riel|៛)?/i.test(cleanText) &&
      !/\$\s*\d/.test(cleanText));

  const currency: "USD" | "KHR" = isKhr ? "KHR" : "USD";

  // 3. Extract Amount
  let amount = 0;

  // Pattern A: explicit labeled amount lines e.g. "Amount: $15.50" or "Total: 60,000 KHR"
  const amountPattern =
    /(?:amount|total\s*amount|total|paid|debit|ចំនួនទឹកប្រាក់)\s*[:=]?\s*(?:\$|usd|៛|khr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const amountMatch = cleanText.match(amountPattern);

  if (amountMatch) {
    const parsed = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Pattern B: standalone currency figures e.g. "$ 25.00" or "៛ 20,000" or "50,000 KHR"
  if (amount === 0) {
    const currencyFigurePattern = isKhr
      ? /(?:៛\s*([0-9,]+)|([0-9,]+)\s*(?:៛|khr|riel))/i
      : /(?:\$\s*([0-9,]+(?:\.[0-9]{1,2})?)|([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:usd|\$))/i;

    const figMatch = cleanText.match(currencyFigurePattern);
    if (figMatch) {
      const matchVal = figMatch[1] || figMatch[2];
      const parsed = parseFloat(matchVal.replace(/,/g, ""));
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }
  }

  // 4. Extract Merchant or Recipient Name
  let merchant = "";

  // Common labeled merchant headers in ABA / Bakong / Wing / ACLEDA
  const merchantLabelPattern =
    /(?:to|paid\s*to|receiver|beneficiary|merchant|to\s*account|អ្នកទទួល)\s*[:=]?\s*([^\n\r,]+)/i;
  const merchantMatch = cleanText.match(merchantLabelPattern);

  if (merchantMatch) {
    const rawMerchant = merchantMatch[1].trim();
    // Clean up noise (account numbers, timestamps, trailing symbols)
    const cleaned = rawMerchant
      .replace(/\s*\(\s*\d{3,}.*?\)/g, "") // remove (***1234)
      .replace(/[#*|]/g, "")
      .trim();

    if (cleaned.length >= 2 && !/^(account|bank|successful|usd|khr)/i.test(cleaned)) {
      merchant = cleaned;
    }
  }

  // Fallback: If not found, look for prominent known store names in text
  if (!merchant) {
    const knownBrands = [
      "Brown Coffee", "KOI Thé", "KOI The", "Amazon Cafe", "Cafe Amazon",
      "Starbucks", "Lucky Supermarket", "Aeon Mall", "Chip Mong",
      "Makro", "Grab", "PassApp", "TADA", "Zando", "EDC", "PPWSA",
      "Smart Axiata", "Cellcard", "Metfone", "Pizza Company", "KFC"
    ];

    for (const brand of knownBrands) {
      if (lowerText.includes(brand.toLowerCase())) {
        merchant = brand;
        break;
      }
    }
  }

  // Default fallback if still empty
  if (!merchant) {
    merchant = detectedBank ? `${detectedBank} Payment` : "KHQR Payment";
  }

  // 5. Extract Transaction Reference ID
  let transactionId: string | undefined;
  const refPattern =
    /(?:txn\s*id|transaction\s*id|trans\s*id|ref\s*(?:no|number)?|trace\s*no|voucher\s*no|លេខកូដប្រតិបត្តិការ)\s*[:=]?\s*([A-Za-z0-9_-]{5,30})/i;
  const refMatch = cleanText.match(refPattern);
  if (refMatch) {
    transactionId = refMatch[1].trim();
  }

  // 6. Extract Date & Time
  let dateTime: string | undefined;
  const datePattern =
    /\b(\d{1,2}[-/\s](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-9]{1,2})[-/\s]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm))?)?|\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)\b/i;
  const dateMatch = cleanText.match(datePattern);
  if (dateMatch) {
    dateTime = dateMatch[1].trim();
  }

  // 7. Match Category
  const searchString = `${merchant} ${cleanText}`;
  const { categoryName, categoryId } = matchReceiptCategory(
    searchString,
    availableCategories
  );

  // Compute confidence score
  let confidence = 0.5;
  if (hasSlipSignals) confidence += 0.2;
  if (detectedBank) confidence += 0.15;
  if (amount > 0) confidence += 0.1;
  if (transactionId) confidence += 0.05;

  confidence = Math.min(0.99, Math.round(confidence * 100) / 100);

  const amountMinor = amount > 0 ? toMinorUnits(amount, currency) : 0n;

  return {
    isSlip: hasSlipSignals,
    bankName: detectedBank,
    amount,
    amountMinor,
    currency,
    merchant,
    transactionId,
    dateTime,
    category: categoryName,
    categoryId,
    confidence,
    rawText: cleanText,
  };
}
