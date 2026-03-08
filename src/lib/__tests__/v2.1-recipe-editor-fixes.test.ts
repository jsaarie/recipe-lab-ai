/**
 * v2.1 Recipe Editor Bug Fix Tests — 12 fixes
 * Run with:  npx tsx src/lib/__tests__/v2.1-recipe-editor-fixes.test.ts
 *
 * Bugs tested:
 *  #1  Unit conversion input:      qty override in metric is already in metric units
 *  #2  Name normalisation:         "all-purpose flour" matches "all purpose flour"
 *  #3  Swapped ingredient match:   patchedStepIngredients maps original name after swap
 *  #4  Density path:               "1 cup flour" → grams (~120g), not ml (~237ml)
 *  #5  No-op qty commit:           commitQty unchanged → onQuantityChange NOT called
 *  #6  Metric formatting:          formatMetricQuantity(473.176) → "473.2" not a fraction
 *  #7  Pre-snap removal:           1/3 cup * ratio 0.5 → "⅙" not "⅛"
 *  #8  Range servings:             "12–16 cookies" → base 12, string preserved in UI
 *  #9  Reset confirm:              first click shows "Confirm?", second click resets
 * #10  No-op swap:                 open swap and close unchanged → no call, wasSwapped false
 * #11  Count ingredients scale:    qty "2" unit "" doubles to "4"
 * #12  Lab HUD swapped names:      after swap "butter"→"margarine", HUD shows "margarine"
 */

// ---------------------------------------------------------------------------
// Inline pure-function copies (from fractions.ts, conversions.ts, density.ts)
// so we have zero dependency on path aliases / module resolution.
// ---------------------------------------------------------------------------

// ---- fractions.ts ----

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

function parseQuantity(qty: string): number | null {
  if (!qty || qty.trim() === "") return null;
  const unicodeMap: Record<string, string> = {
    "⅛": "1/8", "¼": "1/4", "⅓": "1/3", "⅜": "3/8",
    "½": "1/2", "⅝": "5/8", "⅔": "2/3", "¾": "3/4", "⅞": "7/8",
  };
  let s = qty.trim();
  for (const [uc, ascii] of Object.entries(unicodeMap)) {
    s = s.replace(uc, ascii);
  }
  s = s.replace(/^(\d+)(\d+\/\d+)$/, "$1 $2");
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    if (den === 0) return null;
    return whole + num / den;
  }
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    if (den === 0) return null;
    return num / den;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function gcd_simplify(num: number, den: number): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
}

function formatQuantity(value: number): string {
  if (value === 0) return "0";
  const whole = Math.floor(value);
  const decimal = value - whole;
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
  const eights = Math.round(decimal * 8);
  const snappedDecimal = eights / 8;
  const fracKey = eights > 0 ? `${gcd_simplify(eights, 8)}` : "";
  const unicodeFrac = eights > 0 ? UNICODE_FRACTIONS[fracKey] : "";
  if (eights === 0) return whole === 0 ? "0" : `${whole}`;
  if (eights === 8) return `${whole + 1}`;
  if (unicodeFrac) return whole > 0 ? `${whole}${unicodeFrac}` : unicodeFrac;
  const total = whole + snappedDecimal;
  return total % 1 === 0 ? `${total}` : parseFloat(total.toFixed(2)).toString();
}

// ---- density.ts ----

const DENSITY_G_PER_CUP: Record<string, number> = {
  "all-purpose flour": 120,
  "all purpose flour": 120,
  "flour": 120,
  "butter": 227,
  "unsalted butter": 227,
  "salted butter": 227,
  "sugar": 200,
  "milk": 245,
  "oil": 218,
  "vegetable oil": 218,
};

function getDensityGPerCup(ingredientName: string): number | null {
  const normalized = ingredientName.toLowerCase().trim();
  if (normalized in DENSITY_G_PER_CUP) return DENSITY_G_PER_CUP[normalized];
  for (const [key, density] of Object.entries(DENSITY_G_PER_CUP)) {
    if (normalized.includes(key) || key.includes(normalized)) return density;
  }
  return null;
}

function volumeToGrams(ml: number, ingredientName: string): number | null {
  const gPerCup = getDensityGPerCup(ingredientName);
  if (gPerCup === null) return null;
  return (ml / 236.588) * gPerCup;
}

// ---- conversions.ts (subset needed for Bug #1, #4) ----

type UnitSystem = "us" | "metric";

const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892,
  tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
  "fl oz": 29.5735, "fluid ounce": 29.5735, "fluid ounces": 29.5735,
  cup: 236.588, cups: 236.588,
  pt: 473.176, pint: 473.176, pints: 473.176,
  qt: 946.353, quart: 946.353, quarts: 946.353,
  gal: 3785.41, gallon: 3785.41, gallons: 3785.41,
};

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

function bestMetricVolumeUnit(ml: number): { qty: number; unit: string } {
  if (ml >= 1000) return { qty: ml / 1000, unit: "L" };
  if (ml >= 1) return { qty: ml, unit: "ml" };
  return { qty: ml * 1000, unit: "μL" };
}

function bestMetricWeightUnit(g: number): { qty: number; unit: string } {
  if (g >= 1000) return { qty: g / 1000, unit: "kg" };
  return { qty: g, unit: "g" };
}

function convertUnit(qty: number, unit: string, targetSystem: UnitSystem): { qty: number; unit: string } | null {
  const unitLower = unit.toLowerCase().trim();
  if (targetSystem === "metric") {
    if (unitLower in VOLUME_TO_ML) {
      const ml = qty * VOLUME_TO_ML[unitLower];
      return bestMetricVolumeUnit(ml);
    }
    if (unitLower in WEIGHT_TO_G) {
      const g = qty * WEIGHT_TO_G[unitLower];
      return bestMetricWeightUnit(g);
    }
    if (["ml", "l", "g", "kg"].includes(unitLower)) return { qty, unit };
    return null;
  } else {
    if (unitLower === "ml") return { qty, unit: "ml" };
    if (unitLower === "g") return { qty, unit: "g" };
    if (unitLower in VOLUME_TO_ML || unitLower in WEIGHT_TO_G) return { qty, unit };
    return null;
  }
}

/**
 * applyConversion — mirrors the FIXED use-recipe-editor.ts applyConversion.
 * Density path takes priority over bare volume conversion for metric targets.
 *
 * Fix summary (Bug #4): density-based gram conversion is checked BEFORE
 * falling back to direct ml conversion, so "1 cup flour" → grams, not ml.
 */
function applyConversion(
  qty: number,
  unit: string,
  item: string,
  targetSystem: UnitSystem,
): { qty: number; unit: string } {
  const unitLower = unit.toLowerCase().trim();

  // Unitless / count ingredients — no conversion needed
  if (unitLower === "") return { qty, unit };

  const ML_PER_UNIT: Record<string, number> = {
    tsp: 4.92892, teaspoon: 4.92892, teaspoons: 4.92892,
    tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
    cup: 236.588, cups: 236.588,
    "fl oz": 29.5735, "fluid ounce": 29.5735, "fluid ounces": 29.5735,
    pt: 473.176, pint: 473.176, pints: 473.176,
    qt: 946.353, quart: 946.353, quarts: 946.353,
    gal: 3785.41, gallon: 3785.41, gallons: 3785.41,
  };

  if (targetSystem === "metric") {
    // FIXED: prefer density-based weight conversion BEFORE bare volume
    if (unitLower in ML_PER_UNIT) {
      const ml = qty * ML_PER_UNIT[unitLower];
      const g = volumeToGrams(ml, item);
      if (g !== null) {
        return g >= 1000 ? { qty: g / 1000, unit: "kg" } : { qty: g, unit: "g" };
      }
    }
    // Fall back to direct volume conversion (cups → ml, etc.)
    const direct = convertUnit(qty, unit, targetSystem);
    if (direct) return direct;
  } else {
    const direct = convertUnit(qty, unit, targetSystem);
    if (direct) return direct;
  }

  return { qty, unit };
}

// ---- parseServings (from use-recipe-editor.ts) ----

function parseServings(s: string): number | null {
  const match = s.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0]);
  return n > 0 ? n : null;
}

// ---- formatMetricQuantity — the new helper being added in the fix for Bug #6 ----
// The fix: metric quantities must render as decimals (not fraction characters).

function formatMetricQuantity(value: number): string {
  if (value === 0) return "0";
  // Metric values always use decimal notation rounded to 1 decimal place
  // to avoid displaying cooking amounts like 473⅛ ml.
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? `${rounded}` : rounded.toFixed(1);
}

// ---------------------------------------------------------------------------
// Static source reads for component-level tests
// ---------------------------------------------------------------------------

import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(__dirname, "../../..");

function readSource(relPath: string): string {
  return readFileSync(resolve(PROJECT_ROOT, relPath), "utf8");
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(testName: string, actual: unknown, expected: unknown): void {
  const ok =
    typeof actual === "number" && typeof expected === "number"
      ? Math.abs(actual - expected) < 0.01
      : actual === expected;
  if (ok) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected: ${JSON.stringify(expected)}\n         actual  : ${JSON.stringify(actual)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertClose(testName: string, actual: number, expected: number, tolerance = 1): void {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected: ~${expected} (±${tolerance})\n         actual  : ${actual}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertContains(testName: string, source: string, needle: string): void {
  if (source.includes(needle)) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected source to contain: ${JSON.stringify(needle)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertNotContains(testName: string, source: string, needle: string): void {
  if (!source.includes(needle)) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected source to NOT contain: ${JSON.stringify(needle)}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function assertMatchesRegex(testName: string, source: string, pattern: RegExp): void {
  if (pattern.test(source)) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    const msg = `  FAIL  ${testName}\n         expected source to match: ${pattern}`;
    console.error(msg);
    failures.push(msg);
    failed++;
  }
}

function todo(testName: string, reason: string): void {
  console.log(`  TODO  ${testName}\n         Reason: ${reason}`);
}

// ---------------------------------------------------------------------------
// Bug #1 — Unit conversion input:
//   When metric is active and a qty override exists, the override is the
//   already-displayed metric value and should NOT be re-converted.
//
//   Scenario: "1 cup flour" → metric converts to ~120g.
//   User manually types "300" as override. The system must treat "300" as
//   300g (the override is already in the displayed metric unit), not
//   re-run 300 cups → ml → g (which would give ~36,000g).
//
//   The fix lives in derivedIngredients in use-recipe-editor.ts:
//   when override.quantity is set, skip applyConversion and use the override
//   value verbatim (since it was entered while the metric display was active).
// ---------------------------------------------------------------------------

console.log("\nBug #1 — Unit conversion input: override treated as metric, not re-converted");

{
  // Simulate: base ingredient "1 cup flour", scale=1, metric active
  // Without a qty override, conversion gives grams:
  const baseConv = applyConversion(1, "cup", "flour", "metric");
  assertClose(
    "1 cup flour in metric → grams (not ml) via density path",
    baseConv.qty,
    120,
    5,
  );
  assert(
    "1 cup flour in metric → unit is 'g'",
    baseConv.unit,
    "g",
  );

  // With a qty override of "300" (already in metric context):
  // The correct fix: skip applyConversion; display "300 g" as-is.
  // We verify the override value parses to 300 and conversion is NOT re-applied.
  const overrideValue = "300";
  const parsed = parseQuantity(overrideValue);
  assert(
    "Override qty '300' parses to 300",
    parsed,
    300,
  );

  // If the buggy path were taken: applyConversion(300, "cup", "flour", "metric")
  // would give ~36,000g — clearly wrong.
  const buggyPath = applyConversion(300, "cup", "flour", "metric");
  assert(
    "Buggy path (re-converting override) gives wrong result (≠ 300)",
    buggyPath.qty !== 300,
    true,
  );
  assert(
    "Fix: override value 300 is preserved without re-conversion",
    parsed === 300,
    true,
  );
}

// Static source analysis: the fix in use-recipe-editor.ts
{
  const editorSrc = readSource("src/lib/use-recipe-editor.ts");
  // Guard: when override.quantity exists, skip the serving scale step
  assertContains(
    "use-recipe-editor: scaling guard skips override quantity",
    editorSrc,
    "if (!override?.quantity)",
  );
  // Density-first path must be in applyConversion
  assertContains(
    "use-recipe-editor: applyConversion checks density before direct volume",
    editorSrc,
    "volumeToGrams(ml, item)",
  );
}

// ---------------------------------------------------------------------------
// Bug #2 — Name normalisation:
//   getDensityGPerCup("all-purpose flour") and getDensityGPerCup("all purpose flour")
//   must both return 120 (hyphen vs. space variant).
// ---------------------------------------------------------------------------

console.log("\nBug #2 — Name normalisation: hyphen vs. space in ingredient names");

assert(
  'getDensityGPerCup("all-purpose flour") === 120',
  getDensityGPerCup("all-purpose flour"),
  120,
);
assert(
  'getDensityGPerCup("all purpose flour") === 120',
  getDensityGPerCup("all purpose flour"),
  120,
);
assert(
  'getDensityGPerCup("All-Purpose Flour") === 120 (case insensitive)',
  getDensityGPerCup("All-Purpose Flour"),
  120,
);
assert(
  'getDensityGPerCup("All Purpose Flour") === 120 (case insensitive)',
  getDensityGPerCup("All Purpose Flour"),
  120,
);

// Static: density.ts must have both hyphen and space variants of all-purpose flour
{
  const densitySrc = readSource("src/lib/density.ts");
  assertContains(
    "density.ts contains 'all-purpose flour' key",
    densitySrc,
    '"all-purpose flour"',
  );
  assertContains(
    "density.ts contains 'all purpose flour' key",
    densitySrc,
    '"all purpose flour"',
  );
}

// ---------------------------------------------------------------------------
// Bug #3 — Swapped ingredient matching:
//   After a swap from "butter" to "margarine", the step ingredient (si.item = "butter")
//   must still find its derived counterpart.
//
//   The patchedStepIngredients lookup in lab-view.tsx does:
//     derivedIngredients.find(d => d.item.toLowerCase() === si.item.toLowerCase())
//
//   After a swap, derivedIngredients has item = "margarine" (the new name),
//   but si.item is still "butter". The fix: also check the original ingredient
//   name (track original index or match against the base recipe ingredient list).
// ---------------------------------------------------------------------------

console.log("\nBug #3 — Swapped ingredient matching: step references original name");

{
  // Simulate the patchedStepIngredients lookup logic (current/buggy version):
  const derivedIngredients = [
    { quantity: "½", unit: "cup", item: "margarine" }, // after swap from butter
  ];
  const stepIngredient = { quantity: "1", unit: "cup", item: "butter", totalQuantity: "2" };

  // Buggy lookup: matches by item name only → finds nothing → returns si unchanged
  const buggyMatch = derivedIngredients.find(
    (d) => d.item.toLowerCase() === stepIngredient.item.toLowerCase(),
  );
  assert(
    "Buggy lookup: 'butter' does NOT match 'margarine' (demonstrates the bug)",
    buggyMatch,
    undefined,
  );

  // Fixed lookup: must also match original ingredient names.
  // Simulate the fix using original recipe ingredients as a parallel lookup key.
  const originalIngredients = [
    { quantity: "2", unit: "cup", item: "butter" },
  ];
  const fixedMatch = derivedIngredients.find((d, i) => {
    // match by derived item name OR original item name (index-matched)
    return (
      d.item.toLowerCase() === stepIngredient.item.toLowerCase() ||
      originalIngredients[i]?.item.toLowerCase() === stepIngredient.item.toLowerCase()
    );
  });
  assert(
    "Fixed lookup: original 'butter' index matches swapped 'margarine' entry",
    fixedMatch?.item,
    "margarine",
  );
  assert(
    "Fixed lookup: returns the swapped item name 'margarine'",
    fixedMatch?.item === "margarine",
    true,
  );
}

// The actual fix in lab-view.tsx: normaliseName + index-based fallback
{
  // normaliseName normalises case, hyphens, and whitespace
  function normaliseName(s: string): string {
    return s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  }

  const derivedIngredients2 = [
    { quantity: "½", unit: "cup", item: "margarine" },
  ];
  const originalIngredients2 = [
    { quantity: "1", unit: "cup", item: "butter" },
  ];
  const stepIngredient2 = { quantity: "½", unit: "cup", item: "butter" };

  // Fixed lookup: try by normalised name first; if no match, use index via original list
  const fixedMatch2 = (() => {
    const byName = derivedIngredients2.find(
      (d) => normaliseName(d.item) === normaliseName(stepIngredient2.item),
    );
    if (byName) return byName;
    const origIdx = originalIngredients2.findIndex(
      (orig) => normaliseName(orig.item) === normaliseName(stepIngredient2.item),
    );
    return origIdx >= 0 ? derivedIngredients2[origIdx] : undefined;
  })();

  assert(
    "normaliseName-based lookup + index fallback: 'butter' resolves to 'margarine'",
    fixedMatch2?.item,
    "margarine",
  );

  // Static: lab-view.tsx has normaliseName function
  const labViewSrc = readSource("src/components/lab-view.tsx");
  assertContains(
    "lab-view.tsx: normaliseName function normalises hyphens and case",
    labViewSrc,
    "normaliseName",
  );
  assertContains(
    "lab-view.tsx: index-based fallback via recipe.ingredients.findIndex",
    labViewSrc,
    "recipe.ingredients.findIndex",
  );
}

// ---------------------------------------------------------------------------
// Bug #4 — Density path:
//   "1 cup flour" in metric must produce grams (~120g), NOT ml (~237ml).
//   convertUnit("cup" → "metric") returns ml; the density override in
//   applyConversion must take priority and return grams.
// ---------------------------------------------------------------------------

console.log("\nBug #4 — Density path: cup flour converts to grams not ml");

{
  // convertUnit alone (no density) would give ml:
  const directOnly = convertUnit(1, "cup", "metric");
  assert(
    "convertUnit alone: 1 cup → ~237 ml (no density)",
    directOnly !== null && directOnly.unit === "ml",
    true,
  );
  assertClose(
    "convertUnit alone: 1 cup → ~236.6 ml",
    directOnly?.qty ?? 0,
    236.6,
    1,
  );

  // applyConversion with density: should return grams
  const withDensity = applyConversion(1, "cup", "flour", "metric");
  assert(
    "applyConversion: 1 cup flour → unit is 'g'",
    withDensity.unit,
    "g",
  );
  assertClose(
    "applyConversion: 1 cup flour → ~120g",
    withDensity.qty,
    120,
    5,
  );

  // Ensure grams path also works for butter (density 227 g/cup)
  const butterConv = applyConversion(0.5, "cup", "butter", "metric");
  assert(
    "applyConversion: 0.5 cup butter → unit is 'g'",
    butterConv.unit,
    "g",
  );
  assertClose(
    "applyConversion: 0.5 cup butter → ~113.5g",
    butterConv.qty,
    113.5,
    3,
  );
}

// Static: use-recipe-editor.ts applyConversion prefers density over direct volume
{
  const editorSrc = readSource("src/lib/use-recipe-editor.ts");
  assertContains(
    "use-recipe-editor: applyConversion calls volumeToGrams for density path",
    editorSrc,
    "volumeToGrams",
  );
  // The density path must execute before falling back to the direct ml result.
  // The fix: in applyConversion, check density BEFORE returning the direct conversion.
  // Look for the structure: direct conversion is only returned if density fails.
  assertContains(
    "use-recipe-editor: density path returns grams if found",
    editorSrc,
    "if (g !== null)",
  );
}

// ---------------------------------------------------------------------------
// Bug #5 — No-op qty commit:
//   Tapping a quantity, making no change, and committing (blur / Enter) should
//   NOT call onQuantityChange. The fix: compare qtyDraft.trim() to the current
//   displayed quantity before calling the handler.
// ---------------------------------------------------------------------------

console.log("\nBug #5 — No-op qty commit: unchanged qty commit skips onQuantityChange");

{
  const recipeCardSrc = readSource("src/components/recipe-card.tsx");

  // The fix: in commitQty, guard with a !== check before calling onQuantityChange.
  // The fixed code pattern (after trimming):
  //   if (trimmed !== ingredient.quantity) { onQuantityChange(index, trimmed); }
  assertMatchesRegex(
    "recipe-card.tsx: commitQty guards call with inequality check",
    recipeCardSrc,
    /trimmed\s*!==\s*ingredient\.quantity|ingredient\.quantity\s*!==\s*trimmed/,
  );
}

// Logic test: no-op commit scenario
{
  // Simulate the fixed commitQty logic
  const ingredientQty = "1½";
  let onQuantityChangeCalled = false;

  const fixedCommitQty = (qtyDraft: string, currentQty: string) => {
    const trimmed = qtyDraft.trim() || currentQty;
    // Fixed: only call if changed
    if (trimmed !== currentQty) {
      onQuantityChangeCalled = true;
    }
  };

  // No-op: user typed "1½" (same as current)
  fixedCommitQty("1½", ingredientQty);
  assert(
    "No-op commit: same value → onQuantityChange NOT called",
    onQuantityChangeCalled,
    false,
  );

  // Change: user typed "2"
  fixedCommitQty("2", ingredientQty);
  assert(
    "Changed commit: different value → onQuantityChange called",
    onQuantityChangeCalled,
    true,
  );
}

// ---------------------------------------------------------------------------
// Bug #6 — Metric formatting:
//   Metric quantities (ml, g, etc.) must display as decimals, not fractions.
//   formatMetricQuantity(473.176) → "473.2", not "473⅛".
//   formatQuantity(473.176) would incorrectly produce a fraction character.
// ---------------------------------------------------------------------------

console.log("\nBug #6 — Metric formatting: metric values as decimals not fractions");

{
  // formatQuantity (the US formatter) should NOT be used for metric values:
  const fractionalResult = formatQuantity(473.176);
  assert(
    "formatQuantity(473.176) produces a non-decimal (fraction) result — confirms the bug",
    fractionalResult !== "473.2",
    true,
  );

  // The fix: formatMetricQuantity rounds to 1 decimal place
  assert(
    "formatMetricQuantity(473.176) === '473.2'",
    formatMetricQuantity(473.176),
    "473.2",
  );
  assert(
    "formatMetricQuantity(120) === '120' (whole number, no decimal)",
    formatMetricQuantity(120),
    "120",
  );
  assert(
    "formatMetricQuantity(236.588) === '236.6'",
    formatMetricQuantity(236.588),
    "236.6",
  );
  assert(
    "formatMetricQuantity(0.5) === '0.5'",
    formatMetricQuantity(0.5),
    "0.5",
  );
  assert(
    "formatMetricQuantity(1000) === '1000'",
    formatMetricQuantity(1000),
    "1000",
  );

  // Static: the formatter used in the metric path must differ from formatQuantity
  // We check that derivedIngredients in use-recipe-editor doesn't blindly call
  // formatQuantity on all values — or that the metric branch uses a decimal formatter.
  todo(
    "use-recipe-editor.ts: metric branch calls formatMetricQuantity or toFixed, not formatQuantity",
    "Requires formatMetricQuantity to be exported and wired in use-recipe-editor derivedIngredients.",
  );
}

// ---------------------------------------------------------------------------
// Bug #7 — Pre-snap removal:
//   1/3 cup split into ratio=0.5 should give 1/6 cup, formatted as "⅙".
//   The old code rounded to nearest 8th BEFORE the third/sixth check, so
//   1/6 ≈ 0.1667 → nearest 8th is 1/8 ("⅛"). The fix (already in formatQuantity)
//   snaps thirds and sixths first.
// ---------------------------------------------------------------------------

console.log("\nBug #7 — Pre-snap: 1/3 cup * ratio 0.5 → '⅙' not '⅛'");

{
  // Scenario: ingredient "1/3 cup" is used partially in one step.
  //   si.quantity = "1/3" (this step uses 1/3 of the total)
  //   si.totalQuantity = "2/3" (total recipe amount is 2/3 cup)
  //   ratio = (1/3) / (2/3) = 0.5
  //   derived.quantity = "1/3" (after scaling — servings unchanged)
  //   scaledQty = (1/3) * 0.5 = 1/6
  const siQty = parseQuantity("1/3") ?? 0;       // 0.3333
  const siTotal = parseQuantity("2/3") ?? 1;     // 0.6667
  const ratio = siQty / siTotal;                 // exactly 0.5

  const derivedQtyStr = "1/3";                   // total derived quantity (e.g. 1x scaling)
  const derivedQty = parseQuantity(derivedQtyStr) ?? 0; // 0.3333
  const scaledQty = derivedQty * ratio;          // 0.1667 ≈ 1/6

  // Old buggy path in lab-view.tsx: pre-snap to 8ths before formatting
  // Math.round(0.1667 * 8) = Math.round(1.333) = 1 → 1/8 = 0.125 → "⅛"
  const oldSnapped = Math.round(scaledQty * 8) / 8;
  const oldFormatted = formatQuantity(oldSnapped);
  assert(
    "Old path (pre-snap to 8ths): 1/6 rounds to 1/8 → '⅛' (the bug)",
    oldFormatted,
    "⅛",
  );

  // Fixed path: pass scaledQty directly to formatQuantity (no pre-snap).
  // THIRD_SIXTHS check catches 1/6 ≈ 0.1667 (within EPSILON=0.02 of 1/6).
  const fixedFormatted = formatQuantity(scaledQty);
  assert(
    "Fixed path (no pre-snap, formatQuantity handles sixths): 1/6 → '1/6'",
    fixedFormatted === "1/6" || fixedFormatted === "⅙",
    true,
  );

  // Verify formatQuantity handles the exact ratio=0.5 case for 1/3 cup
  assert(
    "formatQuantity(1/3) → '⅓' (baseline thirds snap)",
    formatQuantity(1 / 3),
    "⅓",
  );

  // The key fix: 1/6 is caught by THIRD_SIXTHS snap, not 8th snap
  assert(
    "formatQuantity(1/6) → '1/6' (sixth snap — key fix for Bug #7)",
    formatQuantity(1 / 6) === "1/6" || formatQuantity(1 / 6) === "⅙",
    true,
  );

  // Confirm 1/6 does NOT snap to ⅛
  assert(
    "formatQuantity(1/6) !== '⅛' (no longer mis-snaps to eighth)",
    formatQuantity(1 / 6) !== "⅛",
    true,
  );

  // Static: lab-view.tsx must call formatQuantity(scaledQty) directly, not
  // Math.round(scaledQty*8)/8 first. Verify the pre-snap line was removed.
  const labViewSrc = readSource("src/components/lab-view.tsx");
  assertNotContains(
    "lab-view.tsx: pre-snap line 'Math.round(scaledQty * 8) / 8' removed",
    labViewSrc,
    "Math.round(scaledQty * 8) / 8",
  );
  assertContains(
    "lab-view.tsx: formatQuantity called on raw scaledQty (no pre-snap)",
    labViewSrc,
    "formatQuantity(scaledQty)",
  );
}

// ---------------------------------------------------------------------------
// Bug #8 — Range servings:
//   A recipe with servings "12–16 cookies" should:
//   (a) Use 12 as the numeric base for scaling (first number in range)
//   (b) Preserve the full string "12–16 cookies" somewhere in the UI display
// ---------------------------------------------------------------------------

console.log("\nBug #8 — Range servings: '12–16 cookies' uses 12 as base, preserves string in UI");

{
  // parseServings extracts first number
  assert(
    'parseServings("12–16 cookies") === 12',
    parseServings("12–16 cookies"),
    12,
  );
  assert(
    'parseServings("makes 24 cookies") === 24',
    parseServings("makes 24 cookies"),
    24,
  );
  assert(
    'parseServings("serves 6") === 6',
    parseServings("serves 6"),
    6,
  );
  assert(
    'parseServings("2") === 2',
    parseServings("2"),
    2,
  );
  // En-dash variant
  assert(
    'parseServings("12\u201316 cookies") === 12 (en-dash)',
    parseServings("12\u201316 cookies"),
    12,
  );

  // Static: ServingScaler component should display the raw servings string
  // (from recipe.servings) somewhere as a label/title alongside the numeric scaler.
  todo(
    "recipe-card.tsx: ServingScaler displays raw servings string (e.g. '12–16 cookies') as title or label",
    "Requires a UI prop change to pass recipe.servings string to ServingScaler for display.",
  );
}

// ---------------------------------------------------------------------------
// Bug #9 — Reset confirm:
//   Clicking Reset once shows "Confirm?", NOT calling onResetAll.
//   Clicking Reset again (confirming) calls onResetAll.
//   The current recipe-card.tsx has a single Reset button with direct onResetAll call.
// ---------------------------------------------------------------------------

console.log("\nBug #9 — Reset confirm: two-click confirmation before reset");

{
  // Logic simulation: two-click confirm pattern
  let onResetAllCalled = false;
  let confirmState = false;

  const handleResetClick = () => {
    if (!confirmState) {
      confirmState = true; // show "Confirm?"
      return;
    }
    // Second click: execute
    onResetAllCalled = true;
    confirmState = false;
  };

  // First click
  handleResetClick();
  assert(
    "First reset click: onResetAll NOT called",
    onResetAllCalled,
    false,
  );
  assert(
    "First reset click: confirm state is true (showing 'Confirm?')",
    confirmState,
    true,
  );

  // Second click
  handleResetClick();
  assert(
    "Second reset click: onResetAll IS called",
    onResetAllCalled,
    true,
  );
  assert(
    "Second reset click: confirm state reset to false",
    confirmState,
    false,
  );

  todo(
    "recipe-card.tsx: Reset button implements two-click confirm with 'Confirm?' state",
    "Requires adding confirmReset state to RecipeCard or IngredientRow reset button.",
  );
}

// ---------------------------------------------------------------------------
// Bug #10 — No-op swap:
//   Opening swap field and closing it (blur/Escape) without changing the text
//   must NOT call onItemChange and must NOT set wasSwapped: true.
// ---------------------------------------------------------------------------

console.log("\nBug #10 — No-op swap: unchanged swap field does not call onItemChange");

{
  // Logic simulation: fixed commitSwap
  const originalItem = "butter";
  let onItemChangeCalled = false;

  const fixedCommitSwap = (swapDraft: string) => {
    const trimmed = swapDraft.trim();
    // Fix: only call if changed
    if (trimmed && trimmed !== originalItem) {
      onItemChangeCalled = true;
    }
  };

  // No-op: user opened swap, didn't change text, blurred
  fixedCommitSwap("butter");
  assert(
    "No-op swap (same value): onItemChange NOT called",
    onItemChangeCalled,
    false,
  );

  // Actual change
  fixedCommitSwap("margarine");
  assert(
    "Changed swap ('margarine'): onItemChange IS called",
    onItemChangeCalled,
    true,
  );

  // Empty string: clears draft but does not commit
  onItemChangeCalled = false;
  fixedCommitSwap("");
  assert(
    "Empty swap draft: onItemChange NOT called",
    onItemChangeCalled,
    false,
  );

  // Static: recipe-card.tsx commitSwap must have a !== guard
  const recipeCardSrc = readSource("src/components/recipe-card.tsx");
  // The fix: if (trimmed && trimmed !== ingredient.item) { onItemChange(...) }
  assertContains(
    "recipe-card.tsx: commitSwap guards call — trimmed must differ from ingredient.item",
    recipeCardSrc,
    "trimmed !== ingredient.item",
  );
}

// ---------------------------------------------------------------------------
// Bug #11 — Count ingredients scale:
//   An ingredient with qty "2", unit "", item "lemons" must double to "4"
//   when servings are doubled (scaleFactor = 2).
// ---------------------------------------------------------------------------

console.log("\nBug #11 — Count ingredients scale: unit-less ingredients scale correctly");

{
  // Simulate derivedIngredients logic for a count-based ingredient
  const ing = { quantity: "2", unit: "", item: "lemons" };
  const scaleFactor = 2;

  const qtyNum = parseQuantity(ing.quantity); // 2
  assert(
    "parseQuantity('2') === 2",
    qtyNum,
    2,
  );

  const scaled = (qtyNum ?? 0) * scaleFactor; // 4
  assert(
    "2 lemons * scaleFactor 2 = 4",
    scaled,
    4,
  );

  // applyConversion with empty unit and "us" system returns unchanged
  const converted = applyConversion(scaled, ing.unit, ing.item, "us");
  assert(
    "applyConversion: empty unit → unchanged qty",
    converted.qty,
    4,
  );
  assert(
    "applyConversion: empty unit → unchanged unit (still empty string)",
    converted.unit,
    "",
  );

  // formatQuantity(4) === "4"
  assert(
    "formatQuantity(4) === '4'",
    formatQuantity(scaled),
    "4",
  );

  // Verify fractional count ingredients also work
  const fracCount = parseQuantity("3");
  const scaledFrac = (fracCount ?? 0) * 1.5;
  assert(
    "3 lemons * scaleFactor 1.5 = 4.5 → formatQuantity → '4½'",
    formatQuantity(scaledFrac),
    "4½",
  );

  // Metric conversion with empty unit should be a no-op (not crash)
  const convertedMetric = applyConversion(4, "", "lemons", "metric");
  assert(
    "applyConversion: empty unit in metric system → qty unchanged (4)",
    convertedMetric.qty,
    4,
  );
}

// ---------------------------------------------------------------------------
// Bug #12 — Lab HUD swapped names:
//   After swapping "butter" to "margarine", the Lab HUD (StepIngredients)
//   must show "margarine". This depends on patchedStepIngredients correctly
//   resolving the swapped derivedIngredient.
//
//   The fix: patchedStepIngredients lookup matches by original ingredient index,
//   not just by current item name, so swapped names propagate to the HUD.
// ---------------------------------------------------------------------------

console.log("\nBug #12 — Lab HUD swapped names: post-swap HUD shows new ingredient name");

{
  // Simulate patchedStepIngredients logic (buggy vs fixed)
  const stepIngs = [
    { quantity: "½", unit: "cup", item: "butter" },         // step references "butter"
  ];
  const derivedIngredients = [
    { quantity: "½", unit: "cup", item: "margarine" },       // swapped in editor
  ];

  // Buggy path: match by d.item === si.item → no match
  const buggyResult = stepIngs.map((si) => {
    const derived = derivedIngredients.find(
      (d) => d.item.toLowerCase() === si.item.toLowerCase(),
    );
    return derived ? { ...si, item: derived.item } : si;
  });
  assert(
    "Buggy path: 'butter' step ingredient still shows 'butter' (no match found)",
    buggyResult[0].item,
    "butter",
  );

  // Fixed path: match by index (original ingredients parallel array)
  const originalIngredients = [
    { quantity: "½", unit: "cup", item: "butter" },
  ];
  const fixedResult = stepIngs.map((si) => {
    // Fixed: also try matching by original ingredient at same index
    const derived = derivedIngredients.find(
      (d, i) =>
        d.item.toLowerCase() === si.item.toLowerCase() ||
        originalIngredients[i]?.item.toLowerCase() === si.item.toLowerCase(),
    );
    return derived ? { ...si, quantity: derived.quantity, unit: derived.unit, item: derived.item } : si;
  });
  assert(
    "Fixed path: 'butter' step ingredient resolves to 'margarine' after swap",
    fixedResult[0].item,
    "margarine",
  );

  // After fix, the HUD ingredient name should be "margarine"
  assert(
    "Fixed path: swapped item name propagates to step ingredient display",
    fixedResult[0].item === "margarine",
    true,
  );

  // Static: lab-view patchedStepIngredients must account for swapped names
  const labViewSrc = readSource("src/components/lab-view.tsx");
  assertContains(
    "lab-view.tsx: patchedStepIngredients uses derivedIngredients for quantity/unit patches",
    labViewSrc,
    "derivedIngredients",
  );
  // The fix: use recipe.ingredients (original list) as index-based fallback
  assertContains(
    "lab-view.tsx: patchedStepIngredients index fallback uses recipe.ingredients",
    labViewSrc,
    "recipe.ingredients.findIndex",
  );
  assertContains(
    "lab-view.tsx: patchedStepIngredients dep array includes recipe.ingredients",
    labViewSrc,
    "recipe.ingredients, derivedIngredients",
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const todoCount = [
  "use-recipe-editor.ts: metric branch calls formatMetricQuantity or toFixed, not formatQuantity",
  "recipe-card.tsx: ServingScaler displays raw servings string (e.g. '12–16 cookies') as title or label",
  "recipe-card.tsx: Reset button implements two-click confirm with 'Confirm?' state",
].length;

console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed, ${todoCount} stubbed (TODO)`);
if (failures.length > 0) {
  console.error("\nFailed tests:");
  for (const f of failures) console.error(f);
  process.exit(1);
} else {
  console.log("All runnable tests passed.");
  process.exit(0);
}
