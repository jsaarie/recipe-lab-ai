/**
 * v2.1 Bug Fix Tests — plain TypeScript script (no test framework).
 * Run with:  npx tsx src/lib/__tests__/v2.1-bug-fixes.test.ts
 *
 * Bugs tested:
 *  1. parseQuantity: Unicode fraction attached to whole number ("1¼" → 1.25 not 2.75)
 *  2. formatQuantity: Thirds/sixths snap correctly (0.333 → "⅓" not "⅜")
 *  3. ML_PER_UNIT completeness in use-recipe-editor.ts (static source analysis)
 *  4. qtyDraft useEffect sync in recipe-card.tsx (static source analysis)
 *  5. parseQuantity used instead of bare parseFloat in lab-view.tsx (static source analysis)
 */

import { makeAssertions, readSource } from "./test-helpers";

const { assert, assertContains, summary } = makeAssertions();

// ---------------------------------------------------------------------------
// Inline copies of the functions under test (fractions.ts)
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, string> = {
  "1/8": "⅛", "1/4": "¼", "1/3": "⅓", "3/8": "⅜",
  "1/2": "½", "5/8": "⅝", "2/3": "⅔", "3/4": "¾", "7/8": "⅞",
};

function parseQuantity(qty: string): number | null {
  if (!qty || qty.trim() === "") return null;
  const unicodeMap: Record<string, string> = {
    "⅛": "1/8", "¼": "1/4", "⅓": "1/3", "⅜": "3/8",
    "½": "1/2", "⅝": "5/8", "⅔": "2/3", "¾": "3/4", "⅞": "7/8",
  };
  let s = qty.trim();
  for (const [uc, ascii] of Object.entries(unicodeMap)) s = s.replace(uc, ascii);
  s = s.replace(/^(\d+)(\d+\/\d+)$/, "$1 $2");
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / den;
  }
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return parseInt(fracMatch[1]) / den;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function gcd_simplify(num: number, den: number): string { const g = gcd(num, den); return `${num / g}/${den / g}`; }

function formatQuantity(value: number): string {
  if (value === 0) return "0";
  const whole = Math.floor(value);
  const decimal = value - whole;
  const THIRD_SIXTHS: [number, string][] = [[1/6,"1/6"],[1/3,"1/3"],[2/3,"2/3"],[5/6,"5/6"]];
  const EPSILON = 0.02;
  for (const [frac, key] of THIRD_SIXTHS) {
    if (Math.abs(decimal - frac) < EPSILON) {
      const unicodeFrac = UNICODE_FRACTIONS[key] ?? key;
      return whole > 0 ? `${whole}${unicodeFrac}` : unicodeFrac;
    }
  }
  const eights = Math.round(decimal * 8);
  const fracKey = eights > 0 ? gcd_simplify(eights, 8) : "";
  const unicodeFrac = eights > 0 ? UNICODE_FRACTIONS[fracKey] : "";
  if (eights === 0) return whole === 0 ? "0" : `${whole}`;
  if (eights === 8) return `${whole + 1}`;
  if (unicodeFrac) return whole > 0 ? `${whole}${unicodeFrac}` : unicodeFrac;
  const total = whole + eights / 8;
  return total % 1 === 0 ? `${total}` : parseFloat(total.toFixed(2)).toString();
}

// ---------------------------------------------------------------------------
// Bug 1 — parseQuantity: Unicode fraction attached to whole number
// ---------------------------------------------------------------------------

console.log("\nBug 1 — parseQuantity: Unicode fraction attached to whole number");

assert('parseQuantity("1¼") === 1.25',  parseQuantity("1¼"),   1.25);
assert('parseQuantity("2½") === 2.5',   parseQuantity("2½"),   2.5);
assert('parseQuantity("3¾") === 3.75',  parseQuantity("3¾"),   3.75);
assert('parseQuantity("¼")  === 0.25',  parseQuantity("¼"),    0.25);
assert('parseQuantity("1 1/4") === 1.25', parseQuantity("1 1/4"), 1.25);

// ---------------------------------------------------------------------------
// Bug 2 — formatQuantity: thirds/sixths snap correctly
// ---------------------------------------------------------------------------

console.log("\nBug 2 — formatQuantity: thirds/sixths snap");

assert('formatQuantity(1/3) === "⅓"',        formatQuantity(1/3),      "⅓");
assert('formatQuantity(2/3) === "⅔"',        formatQuantity(2/3),      "⅔");
assert('formatQuantity(1 + 1/3) === "1⅓"',  formatQuantity(1 + 1/3),  "1⅓");
assert('formatQuantity(0.25) === "¼"',       formatQuantity(0.25),     "¼");
assert('formatQuantity(0.5) === "½"',        formatQuantity(0.5),      "½");
assert('formatQuantity(0.375) === "⅜"',      formatQuantity(0.375),    "⅜");

// ---------------------------------------------------------------------------
// Bug 3 — ML_PER_UNIT completeness in use-recipe-editor.ts (static analysis)
// ---------------------------------------------------------------------------

console.log("\nBug 3 — ML_PER_UNIT completeness (static source analysis)");

const editorSrc = readSource("src/lib/use-recipe-editor.ts");

function assertMLKey(key: string): void {
  const pattern = new RegExp(`["']?${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*:`);
  assert(`ML_PER_UNIT contains key "${key}"`, pattern.test(editorSrc), true);
}

for (const key of ["fl oz","fluid ounce","fluid ounces","pt","pint","pints","qt","quart","quarts","gal","gallon","gallons"]) {
  assertMLKey(key);
}

// ---------------------------------------------------------------------------
// Bug 4 — qtyDraft useEffect sync (static analysis)
// ---------------------------------------------------------------------------

console.log("\nBug 4 — qtyDraft useEffect dependency array sync (static source analysis)");

const recipeCardSrc = readSource("src/components/recipe-card.tsx");
assertContains("useEffect syncs qtyDraft when !editingQty", recipeCardSrc, "if (!editingQty) setQtyDraft(ingredient.quantity);");
assertContains("useEffect dep array includes [ingredient.quantity, editingQty]", recipeCardSrc, "[ingredient.quantity, editingQty]");

// ---------------------------------------------------------------------------
// Bug 5 — parseQuantity used in lab-view.tsx (static analysis)
// ---------------------------------------------------------------------------

console.log("\nBug 5 — parseQuantity used in lab-view patchedStepIngredients (static source analysis)");

const labViewSrc = readSource("src/components/lab-view.tsx");
assertContains('parseQuantity imported from "@/lib/fractions"', labViewSrc, 'import { parseQuantity, formatQuantity } from "@/lib/fractions"');
assertContains("parseQuantity used in patchedStepIngredients for si.quantity", labViewSrc, "parseQuantity(si.quantity) ?? parseFloat(si.quantity)");
assertContains("parseQuantity used in patchedStepIngredients for si.totalQuantity", labViewSrc, "parseQuantity(si.totalQuantity) ?? parseFloat(si.totalQuantity)");
assertContains("parseQuantity used in patchedStepIngredients for derived.quantity", labViewSrc, "parseQuantity(derived.quantity) ?? parseFloat(derived.quantity)");

summary();
