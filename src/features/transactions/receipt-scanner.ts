/**
 * AI & Heuristic Receipt & KHQR Payment Slip Scanner (Spec 3.4 #22)
 * Extracts merchant name, total amount, currency, date, banking source, and suggested category
 * from receipt photos, mobile banking screenshots (ABA, Bakong, Wing, ACLEDA), and raw text.
 */

import { toMinorUnits } from "@/lib/money";
import {
  type AvailableCategory,
  CATEGORY_KEYWORDS,
  matchReceiptCategory,
} from "./categories";
import { parseKhqrBankingSlip, type DetectedBank } from "./khqr-slip-parser";

export interface ScannedReceiptResult {
  success: boolean;
  merchant?: string;
  amount?: number;
  amountMinor?: bigint;
  currency?: "USD" | "KHR";
  date?: string;
  category?: string;
  categoryId?: string;
  rawText?: string;
  confidence: number;
  source: "gemini_vision" | "heuristic_engine" | "khqr_slip_parser";
  bankName?: DetectedBank;
  transactionId?: string;
  receiptUrl?: string;
  error?: string;
}

export {
  type AvailableCategory,
  CATEGORY_KEYWORDS,
  matchReceiptCategory,
};

/**
 * Pure heuristic parser for receipt and mobile payment slip text lines
 */
export function parseReceiptText(
  rawText: string,
  availableCategories: AvailableCategory[] = []
): ScannedReceiptResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      success: false,
      confidence: 0,
      source: "heuristic_engine",
      error: "No readable text found in receipt",
    };
  }

  // 1. Check if the text matches a mobile banking slip or KHQR voucher
  const slipResult = parseKhqrBankingSlip(rawText, availableCategories);
  if (slipResult.isSlip && slipResult.amount > 0) {
    return {
      success: true,
      merchant: slipResult.merchant,
      amount: slipResult.amount,
      amountMinor: slipResult.amountMinor,
      currency: slipResult.currency,
      date: slipResult.dateTime || new Date().toISOString().slice(0, 10),
      category: slipResult.category,
      categoryId: slipResult.categoryId,
      rawText,
      confidence: slipResult.confidence,
      source: "khqr_slip_parser",
      bankName: slipResult.bankName,
      transactionId: slipResult.transactionId,
    };
  }

  // 2. Standard paper receipt extraction
  // Detect Currency
  const isKhr = /\b(khr|riel|៛)\b/i.test(rawText);
  const currency: "USD" | "KHR" = isKhr ? "KHR" : "USD";

  // Extract Merchant Name
  let merchant = "";
  const ignoredHeaderWords = /^(receipt|tax invoice|invoice|bill|order|welcome|date|table|guest|cashier|check)/i;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.length >= 3 && !ignoredHeaderWords.test(line) && !/^\d+[\s\-/:]/.test(line)) {
      merchant = line.replace(/[#*=:_-]+/g, "").trim();
      break;
    }
  }
  if (!merchant && lines.length > 0) {
    merchant = lines[0].slice(0, 32);
  }

  // Extract Amount
  let extractedAmount: number | undefined;
  const totalLineRegex = /(?:total|amount|balance|charge|paid|net|grand total)\s*[:=]?\s*(?:\$|៛)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(totalLineRegex);
    if (match) {
      const numStr = match[1].replace(/,/g, "");
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0) {
        extractedAmount = val;
        break;
      }
    }
  }

  if (extractedAmount === undefined) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(/(?:\$|៛)\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(val) && val > 0) {
          extractedAmount = val;
          break;
        }
      }
    }
  }

  // Extract Date
  let dateStr: string | undefined;
  const dateMatch = rawText.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/);
  if (dateMatch) {
    const rawDate = dateMatch[1];
    if (/^\d{4}/.test(rawDate)) {
      dateStr = rawDate.replace(/[./]/g, "-");
    } else {
      try {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().slice(0, 10);
        }
      } catch {
        dateStr = new Date().toISOString().slice(0, 10);
      }
    }
  }
  if (!dateStr) {
    dateStr = new Date().toISOString().slice(0, 10);
  }

  // Inferred Category
  const { categoryName, categoryId } = matchReceiptCategory(
    `${merchant} ${rawText}`,
    availableCategories
  );

  const amount = extractedAmount ?? 0;
  const amountMinor = amount > 0 ? toMinorUnits(amount, currency) : BigInt(0);

  return {
    success: amount > 0,
    merchant: merchant || "Receipt Store",
    amount,
    amountMinor,
    currency,
    date: dateStr,
    category: categoryName,
    categoryId,
    rawText,
    confidence: extractedAmount ? 0.8 : 0.4,
    source: "heuristic_engine",
  };
}

/**
 * Call Gemini Multimodal Vision API to parse a receipt photo or payment slip screenshot
 */
export async function parseReceiptWithGemini(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  availableCategories: AvailableCategory[] = []
): Promise<ScannedReceiptResult> {
  const categoryNames = availableCategories.length > 0
    ? availableCategories.map((c) => c.name).join(", ")
    : Object.keys(CATEGORY_KEYWORDS).join(", ");

  const prompt = `You are a high-precision receipt and mobile banking payment slip analysis engine for a personal finance app.
Inspect this photo (which may be a store receipt or a mobile banking payment slip like ABA Mobile, Bakong KHQR, Wing Bank, or ACLEDA).
Extract:
1. "merchant": The official store, restaurant, payee, or business name (remove "To:", "Paid to", or account numbers).
2. "amount": The final total amount charged or transferred as a positive number (e.g. 4.50 or 25000).
3. "currency": Either "USD" or "KHR" based on symbols ($, ៛, USD, KHR, Riel, រៀល).
4. "date": The date of transaction in YYYY-MM-DD format (if visible, otherwise today).
5. "category": Pick the single best category from this list: [${categoryNames}].
6. "bankName": If this is a banking slip/screenshot, identify the bank (e.g. "ABA Mobile", "Bakong", "Wing Bank", "ACLEDA Mobile") or null.
7. "transactionId": The transaction ID, ref number, or hash if visible, or null.
8. "confidence": A score between 0.0 and 1.0 based on image clarity.

Respond ONLY with valid, raw JSON (no markdown backticks, no explanatory text):
{"merchant": "...", "amount": 0.0, "currency": "USD", "date": "YYYY-MM-DD", "category": "...", "bankName": null, "transactionId": null, "confidence": 0.95}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error("No text response returned from Gemini Vision model");
    }

    const cleanedJson = candidate.replace(/^```json/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleanedJson);

    const amount = typeof parsed.amount === "number" ? parsed.amount : parseFloat(parsed.amount);
    const currency: "USD" | "KHR" = parsed.currency === "KHR" ? "KHR" : "USD";
    const amountMinor = amount > 0 ? toMinorUnits(amount, currency) : BigInt(0);

    const { categoryName, categoryId } = matchReceiptCategory(
      parsed.category || parsed.merchant || "",
      availableCategories
    );

    return {
      success: true,
      merchant: parsed.merchant || "Payment Payee",
      amount,
      amountMinor,
      currency,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      category: categoryName,
      categoryId,
      bankName: parsed.bankName || undefined,
      transactionId: parsed.transactionId || undefined,
      confidence: parsed.confidence || 0.95,
      source: "gemini_vision",
    };
  } catch (err) {
    return {
      success: false,
      confidence: 0,
      source: "gemini_vision",
      error: err instanceof Error ? err.message : "Failed to analyze receipt with Gemini",
    };
  }
}
