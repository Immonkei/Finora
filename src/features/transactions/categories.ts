/**
 * Centralized Category Definitions and Matching Heuristics
 */

export interface AvailableCategory {
  id: string;
  name: string;
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Drinks": [
    "coffee", "cafe", "latte", "espresso", "starbucks", "brown coffee",
    "restaurant", "bakery", "bread", "burger", "pizza", "kfc", "mcdonalds",
    "bistro", "kitchen", "diner", "lunch", "dinner", "breakfast", "food",
    "tea", "beverage", "bar", "brewery", "grill", "noodle", "sushi", "pho",
    "snack", "drink", "beer"
  ],
  "Groceries": [
    "supermarket", "grocery", "groceries", "mart", "market", "lucky supermarket", "aeon",
    "makro", "walmart", "costco", "aldi", "whole foods", "produce", "fruits",
    "vegetables", "milk", "bread", "butcher", "fish", "meat", "target"
  ],
  "Transport": [
    "grab", "uber", "taxi", "ride", "passapp", "fuel", "gas", "petrol",
    "shell", "caltex", "total", "tela", "parking", "toll", "transit",
    "metro", "bus", "train", "airline", "flight", "subway"
  ],
  "Housing & Bills": [
    "rent", "electric", "electricity", "water", "edc", "utility", "wifi",
    "internet", "telecom", "smart", "cellcard", "metfone", "bill", "phone",
    "subscription", "cell"
  ],
  "Entertainment": [
    "cinema", "movie", "theatre", "netflix", "spotify", "game", "steam",
    "playstation", "nintendo", "arcade", "concert", "bowling", "karaoke", "club"
  ],
  "Shopping": [
    "zara", "uniqlo", "h&m", "apple", "clothing", "clothes", "shoes", "fashion",
    "amazon", "electronics", "retail", "store", "mall", "boutique", "apparel", "gift"
  ],
  "Health & Medical": [
    "pharmacy", "pharma", "medicine", "hospital", "clinic", "doctor",
    "dentist", "optical", "dental", "gym", "fitness", "supplement", "workout"
  ],
};

/**
 * Matches raw merchant or text string against known category keywords.
 */
export function matchCategoryNameFromText(text: string): string | null {
  const normalized = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        return category;
      }
    }
  }
  return null;
}

/**
 * Matches merchant name or receipt text to the best matching category from available categories.
 */
export function matchReceiptCategory(
  merchantOrText: string,
  availableCategories: AvailableCategory[] = []
): { categoryId?: string; categoryName: string } {
  const matchedName = matchCategoryNameFromText(merchantOrText);

  if (matchedName) {
    const found = availableCategories.find(
      (c) => c.name.toLowerCase() === matchedName.toLowerCase()
    );
    if (found) {
      return { categoryId: found.id, categoryName: found.name };
    }
    return { categoryId: undefined, categoryName: matchedName };
  }

  // Fallback to first available category or generic "Other"
  if (availableCategories.length > 0) {
    return {
      categoryId: availableCategories[0].id,
      categoryName: availableCategories[0].name,
    };
  }

  return { categoryId: undefined, categoryName: "General" };
}
