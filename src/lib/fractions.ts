/**
 * Fraction parsing and Unicode formatting utilities.
 * Used by the recipe editor to display scaled quantities as readable fractions.
 */

// Unicode fraction characters
const UNICODE_FRACTIONS: Record<string, string> = {
  "1/8": "⅛",
  "1/4": "¼",
  "1/3": "⅓",
  "3/8": "⅜",
  "1/2": "½",
  "5/8": "⅝",
  "2/3": "⅔",
  "3/4": "¾",
  "7/8": "⅞",
};

/**
 * Parse a quantity string (e.g. "2 1/4", "½", "1.5", "3") into a decimal number.
 * Returns null if unparseable.
 */
export function parseQuantity(qty: string): number | null {
  if (!qty || qty.trim() === "") return null;

  // Replace Unicode fractions with ASCII equivalents first
  const unicodeMap: Record<string, string> = {
    "⅛": "1/8", "¼": "1/4", "⅓": "1/3", "⅜": "3/8",
    "½": "1/2", "⅝": "5/8", "⅔": "2/3", "¾": "3/4", "⅞": "7/8",
  };
  let s = qty.trim();
  for (const [uc, ascii] of Object.entries(unicodeMap)) {
    s = s.replace(uc, ascii);
  }

  // Normalise "1¼" → "11/4" (after substitution) → "1 1/4"
  s = s.replace(/^(\d+)(\d+\/\d+)$/, "$1 $2");

  // Whole number + fraction: "2 1/4"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  // Pure fraction: "3/4"
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return num / den;
  }

  // Plain decimal or integer
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Format a decimal number as a human-readable quantity string.
 * Uses Unicode fraction characters where possible.
 * e.g. 2.25 → "2¼", 0.333 → "⅓", 1.5 → "1½"
 */
export function formatQuantity(value: number): string {
  if (value === 0) return "0";

  const whole = Math.floor(value);
  const decimal = value - whole;

  // Snap to thirds and sixths before falling through to eighth-snapping
  const THIRD_SIXTHS: [number, string][] = [
    [1 / 6, "1/6"],
    [1 / 3, "1/3"],
    [2 / 3, "2/3"],
    [5 / 6, "5/6"],
  ];
  const EPSILON = 0.02;
  for (const [frac, key] of THIRD_SIXTHS) {
    if (Math.abs(decimal - frac) < EPSILON) {
      const unicodeFrac = UNICODE_FRACTIONS[key] ?? key;
      return whole > 0 ? `${whole}${unicodeFrac}` : unicodeFrac;
    }
  }

  // Snap decimal to nearest 8th
  const eights = Math.round(decimal * 8);
  const snappedDecimal = eights / 8;

  const fracKey = eights > 0 ? `${gcd_simplify(eights, 8)}` : "";
  const unicodeFrac = eights > 0 ? UNICODE_FRACTIONS[fracKey] : "";

  if (eights === 0) {
    return whole === 0 ? "0" : `${whole}`;
  }

  if (eights === 8) {
    // Round up
    return `${whole + 1}`;
  }

  if (unicodeFrac) {
    return whole > 0 ? `${whole}${unicodeFrac}` : unicodeFrac;
  }

  // Fallback: decimal rounded to 2 places
  const total = whole + snappedDecimal;
  return total % 1 === 0 ? `${total}` : parseFloat(total.toFixed(2)).toString();
}

export function formatMetricQuantity(value: number): string {
  if (value === 0) return "0";
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? `${rounded}` : rounded.toFixed(1);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function gcd_simplify(num: number, den: number): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}
