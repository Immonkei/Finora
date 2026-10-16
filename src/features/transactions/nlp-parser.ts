/**
 * Natural Language Transaction Entry Parser (Spec 3.4 #21)
 * Extracts amount, currency, note, and inferred category from human strings.
 * Examples:
 *   "coffee 2.5" -> { amount: 2.5, currency: "USD", note: "coffee", categoryId: "cat-food" }
 *   "grab 8000 khr" -> { amount: 8000, currency: "KHR", note: "grab", categoryId: "cat-transport" }
 *   "groceries 45.90" -> { amount: 45.9, currency: "USD", note: "groceries", categoryId: "cat-groceries" }
 */

export interface ParsedTransaction {
  amount: number;
  currency: "USD" | "KHR";
  note: string;
  categoryName: string;
}

import { matchCategoryNameFromText } from "./categories";

export function parseNaturalLanguageInput(rawInput: string): ParsedTransaction | null {
  const text = rawInput.trim();
  if (!text) return null;

  // Detect currency (default to USD, detect KHR or riel)
  const isKhr = /\b(khr|riel|៛)\b/i.test(text);
  const currency: "USD" | "KHR" = isKhr ? "KHR" : "USD";

  // Regex to extract numbers (e.g., "2.5", "15.00", "4000", "$12.50")
  const numberRegex = /(?:\$|៛)?\s*(\d+(?:\.\d{1,2})?)/i;
  const match = text.match(numberRegex);

  if (!match) return null;

  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) return null;

  // Remove the amount and currency words from the string to get the note
  let cleanedNote = text
    .replace(/(?:\$|៛)?\s*\d+(?:\.\d{1,2})?/gi, "")
    .replace(/\b(khr|riel|usd|\$|៛)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // If note became empty, default to "Quick expense"
  if (!cleanedNote) {
    cleanedNote = "Quick expense";
  }

  // Capitalize first letter of note
  cleanedNote = cleanedNote.charAt(0).toUpperCase() + cleanedNote.slice(1);

  // Infer category from keywords in the note using centralized matcher
  const categoryName = matchCategoryNameFromText(cleanedNote) || "Food & Drinks";

  return {
    amount,
    currency,
    note: cleanedNote,
    categoryName,
  };
}
