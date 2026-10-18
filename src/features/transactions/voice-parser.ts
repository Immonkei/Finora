/**
 * Voice Expense Parser
 * Converts spoken voice transcripts into structured transaction records.
 * Handles digits, spoken number words ("two dollars fifty", "eight thousand riel"),
 * dual currencies (USD & KHR), merchant detection, and category matching.
 */

import { matchCategoryNameFromText } from "./categories";

export interface ParsedVoiceExpense {
  rawTranscript: string;
  amount: number;
  currency: "USD" | "KHR";
  note: string;
  categoryName: string;
  confidence: number;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40, // common ASR misspelling
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const SCALE_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  million: 1000000,
};

/**
 * Converts an array of spoken number word tokens into a single integer.
 * e.g. ["eight", "thousand"] -> 8000
 * e.g. ["twenty", "five"] -> 25
 * e.g. ["one", "hundred", "twenty"] -> 120
 */
export function spokenWordsToNumber(tokens: string[]): number | null {
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let hasValidNumber = false;

  for (const token of tokens) {
    const clean = token.toLowerCase();

    // Check if token is directly numeric (e.g. "25" or "8000")
    if (/^\d+$/.test(clean)) {
      const val = parseInt(clean, 10);
      current += val;
      hasValidNumber = true;
      continue;
    }

    if (clean in NUMBER_WORDS) {
      current += NUMBER_WORDS[clean];
      hasValidNumber = true;
    } else if (clean === "hundred") {
      current = (current === 0 ? 1 : current) * 100;
      hasValidNumber = true;
    } else if (clean === "thousand") {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
      hasValidNumber = true;
    } else if (clean === "million") {
      total += (current === 0 ? 1 : current) * 1000000;
      current = 0;
      hasValidNumber = true;
    } else if (clean === "and") {
      // ignore filler word
      continue;
    } else {
      // encountered non-number token
      break;
    }
  }

  if (!hasValidNumber) return null;
  return total + current;
}

/**
 * Main parser for spoken natural language input.
 */
export function parseVoiceExpense(rawTranscript: string): ParsedVoiceExpense | null {
  const text = rawTranscript.trim();
  if (!text) return null;

  // 1. Detect Currency
  // Explicit KHR / Riel indicators
  const isKhr = /\b(khr|riel|riels|reil|៛)\b/i.test(text);
  const isUsd = /\b(usd|dollar|dollars|bucks|buck|cents|cent|\$)\b/i.test(text);

  let detectedCurrency: "USD" | "KHR" = isKhr ? "KHR" : "USD";

  let extractedAmount: number | null = null;
  let amountMatchSnippet = "";

  // 2. Try Pattern: Spoken dollars and cents: e.g. "X dollars and Y cents" or "X dollars Y cents" or "X dollars Y"
  const dollarsAndCentsRegex =
    /\b([a-z\d\s-]+?)\s+(?:dollars?|bucks?|\$)\s+(?:and\s+)?([a-z\d\s-]+?)\s+(?:cents?)\b/i;
  const dcMatch = text.match(dollarsAndCentsRegex);

  if (dcMatch) {
    const dollarTokens = dcMatch[1].trim().split(/[\s-]+/);
    const centTokens = dcMatch[2].trim().split(/[\s-]+/);

    const dollars = spokenWordsToNumber(dollarTokens);
    const cents = spokenWordsToNumber(centTokens);

    if (dollars !== null && cents !== null) {
      extractedAmount = dollars + cents / 100;
      amountMatchSnippet = dcMatch[0];
      detectedCurrency = "USD";
    }
  }

  // 3. Try Pattern: "X dollars Y" e.g. "two dollars fifty", "5 dollars 50"
  if (extractedAmount === null) {
    const dollarsShyRegex =
      /\b([a-z\d\s-]+?)\s+(?:dollars?|bucks?|\$)\s+([a-z\d]+)\b/i;
    const dsMatch = text.match(dollarsShyRegex);
    if (dsMatch) {
      const dollarTokens = dsMatch[1].trim().split(/[\s-]+/);
      const centToken = dsMatch[2].trim();
      const dollars = spokenWordsToNumber(dollarTokens);
      const cents = spokenWordsToNumber([centToken]);

      if (dollars !== null && cents !== null && cents >= 1 && cents <= 99) {
        extractedAmount = dollars + cents / 100;
        amountMatchSnippet = dsMatch[0];
        detectedCurrency = "USD";
      }
    }
  }

  // 4. Try Pattern: "X point Y" e.g. "two point five", "3 point 75"
  if (extractedAmount === null) {
    const pointRegex = /\b([a-z\d\s-]+?)\s+point\s+([a-z\d\s-]+?)\b/i;
    const ptMatch = text.match(pointRegex);
    if (ptMatch) {
      const wholeTokens = ptMatch[1].trim().split(/[\s-]+/);
      const decTokens = ptMatch[2].trim().split(/[\s-]+/);
      const whole = spokenWordsToNumber(wholeTokens);
      const dec = spokenWordsToNumber(decTokens);

      if (whole !== null && dec !== null) {
        const decStr = dec.toString();
        extractedAmount = parseFloat(`${whole}.${decStr}`);
        amountMatchSnippet = ptMatch[0];
      }
    }
  }

  // 5. Try Pattern: Direct numeric digits e.g. "$2.50", "2.50", "8000 riels", "15.00"
  if (extractedAmount === null) {
    const digitRegex = /(?:\$|៛)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|riel|riels|khr|usd|\$|៛)?/i;
    const dMatch = text.match(digitRegex);
    if (dMatch) {
      const cleanNumStr = dMatch[1].replace(/,/g, "");
      const parsedNum = parseFloat(cleanNumStr);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        extractedAmount = parsedNum;
        amountMatchSnippet = dMatch[0];
      }
    }
  }

  // 6. Try Pattern: Pure spoken number words e.g. "twenty five dollars", "eight thousand riel", "fifteen"
  if (extractedAmount === null) {
    const words = text.toLowerCase().split(/[\s-]+/);
    const numberTokens: string[] = [];
    let startIdx = -1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i].replace(/[^\w]/g, "");
      if (w in NUMBER_WORDS || w in SCALE_WORDS || w === "and" || /^\d+$/.test(w)) {
        if (startIdx === -1) startIdx = i;
        numberTokens.push(w);
      } else if (numberTokens.length > 0) {
        // finished contiguous sequence of number tokens
        break;
      }
    }

    if (numberTokens.length > 0) {
      const numVal = spokenWordsToNumber(numberTokens);
      if (numVal !== null && numVal > 0) {
        extractedAmount = numVal;
        amountMatchSnippet = numberTokens.join(" ");
      }
    }
  }

  if (extractedAmount === null || isNaN(extractedAmount) || extractedAmount <= 0) {
    return null;
  }

  // Heuristic: If amount is >= 500 and no explicit currency word was given, default to KHR
  if (!isUsd && !isKhr && extractedAmount >= 500) {
    detectedCurrency = "KHR";
  }

  // 7. Extract & Clean Note
  let cleanedNote = text;

  // Remove the matched amount snippet
  if (amountMatchSnippet) {
    cleanedNote = cleanedNote.replace(amountMatchSnippet, " ");
  }

  // Remove currency keywords
  cleanedNote = cleanedNote.replace(
    /\b(dollars?|bucks?|cents?|cent|usd|\$|riel|riels|reil|khr|៛)\b/gi,
    " "
  );

  // Remove common filler verbs and prepositions
  cleanedNote = cleanedNote.replace(
    /\b(i\s+spent|spent|i\s+paid|paid|bought|got|added|add|log|record|for|at|on|worth\s+of|to)\b/gi,
    " "
  );

  // Remove any remaining dangling numbers or symbols
  cleanedNote = cleanedNote.replace(/[0-9]+(?:\.[0-9]{1,2})?/g, " ");
  cleanedNote = cleanedNote.replace(/[^\w\s\u1780-\u17FF]/g, " ");
  cleanedNote = cleanedNote.replace(/\s+/g, " ").trim();

  // Infer Category
  const categoryName =
    matchCategoryNameFromText(cleanedNote) ||
    matchCategoryNameFromText(text) ||
    "Food & Drinks";

  // If note became empty, default to clean descriptive label
  if (!cleanedNote) {
    cleanedNote = categoryName;
  } else {
    cleanedNote = cleanedNote.charAt(0).toUpperCase() + cleanedNote.slice(1);
  }

  // Confidence estimation
  let confidence = 0.85;
  if (isKhr || isUsd) confidence += 0.05;
  if (cleanedNote && cleanedNote !== "Food & Drinks") confidence += 0.05;

  return {
    rawTranscript: text,
    amount: extractedAmount,
    currency: detectedCurrency,
    note: cleanedNote,
    categoryName,
    confidence: Math.min(confidence, 0.99),
  };
}
