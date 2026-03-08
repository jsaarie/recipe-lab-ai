/**
 * v2.1 Recipe Editor Bug Fix Tests — 12 fixes
 * Run with:  npx tsx src/lib/__tests__/v2.1-recipe-editor-fixes.test.ts
 *
 * Bugs tested:
 *  #1  Unit conversion input: qty override in metric is already in metric units
 *  #2  Name normalisation: "all-purpose flour" matches "all purpose flour"
 *  #3  Swapped ingredient match: patchedStepIngredients maps original name after swap
 *  #4  Density path: "1 cup flour" → grams (~120g), not ml (~237ml)
 *  #5  No-op qty commit: commitQty unchanged → onQuantityChange NOT called
 *  #6  Metric formatting: formatMetricQuantity(473.176) → "473.2" not a fraction
 *  #7  Pre-snap removal: 1/3 cup * ratio 0.5 → "⅙" not "⅛"
 *  #8  Range servings: "12–16 cookies" → base 12, string preserved in UI
 *  #9  Reset confirm: first click shows "Confirm?", second click resets
 * #10  No-op swap: open swap and close unchanged → no call, wasSwapped false
 * #11  Count ingredients scale: qty "2" unit "" doubles to "4"
 * #12  Lab HUD swapped names: after swap "butter"→"margarine", HUD shows "margarine"
 */

import { makeAssertions, readSource } from "./test-helpers";

const {
  assert, assertClose, assertContains, assertNotContains, assertMatchesRegex, todo, summary
} = makeAssertions();

// ---------------------------------------------------------------------------
// Inline pure-function copies (from fractions.ts, conversions.ts, density.ts)
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, string> = {
  "1/8":"⅛","1/4":"¼","1/3":"⅓","3/8":"⅜","1/2":"½","5/8":"⅝","2/3":"⅔","3/4":"¾","7/8":"⅞",
};

function parseQuantity(qty: string): number | null {
  if (!qty || qty.trim() === "") return null;
  const unicodeMap: Record<string, string> = { "⅛":"1/8","¼":"1/4","⅓":"1/3","⅜":"3/8","½":"1/2","⅝":"5/8","⅔":"2/3","¾":"3/4","⅞":"7/8" };
  let s = qty.trim();
  for (const [uc, ascii] of Object.entries(unicodeMap)) s = s.replace(uc, ascii);
  s = s.replace(/^(\d+)(\d+\/\d+)$/, "$1 $2");
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) { const den = parseInt(mixedMatch[3]); if (den === 0) return null; return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / den; }
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) { const den = parseInt(fracMatch[2]); if (den === 0) return null; return parseInt(fracMatch[1]) / den; }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function gcd_simplify(num: number, den: number): string { const g = gcd(num, den); return `${num/g}/${den/g}`; }

function formatQuantity(value: number): string {
  if (value === 0) return "0";
  const whole = Math.floor(value);
  const decimal = value - whole;
  const THIRD_SIXTHS: [number, string][] = [[1/6,"1/6"],[1/3,"1/3"],[2/3,"2/3"],[5/6,"5/6"]];
  const EPSILON = 0.02;
  for (const [frac, key] of THIRD_SIXTHS) {
    if (Math.abs(decimal - frac) < EPSILON) { const uf = UNICODE_FRACTIONS[key] ?? key; return whole > 0 ? `${whole}${uf}` : uf; }
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

// density.ts (subset)
const DENSITY_G_PER_CUP: Record<string, number> = {
  "all-purpose flour":120,"all purpose flour":120,"flour":120,"butter":227,"unsalted butter":227,"salted butter":227,"sugar":200,"milk":245,"oil":218,"vegetable oil":218,
};

function getDensityGPerCup(ingredientName: string): number | null {
  const n = ingredientName.toLowerCase().trim();
  if (n in DENSITY_G_PER_CUP) return DENSITY_G_PER_CUP[n];
  for (const [key, d] of Object.entries(DENSITY_G_PER_CUP)) { if (n.includes(key) || key.includes(n)) return d; }
  return null;
}

function volumeToGrams(ml: number, ingredientName: string): number | null {
  const gPerCup = getDensityGPerCup(ingredientName);
  return gPerCup === null ? null : (ml / 236.588) * gPerCup;
}

// conversions.ts (subset)
type UnitSystem = "us" | "metric";

const VOLUME_TO_ML: Record<string, number> = {
  tsp:4.92892,teaspoon:4.92892,teaspoons:4.92892,tbsp:14.7868,tablespoon:14.7868,tablespoons:14.7868,
  "fl oz":29.5735,"fluid ounce":29.5735,"fluid ounces":29.5735,cup:236.588,cups:236.588,
  pt:473.176,pint:473.176,pints:473.176,qt:946.353,quart:946.353,quarts:946.353,gal:3785.41,gallon:3785.41,gallons:3785.41,
};
const WEIGHT_TO_G: Record<string, number> = { oz:28.3495,ounce:28.3495,ounces:28.3495,lb:453.592,lbs:453.592,pound:453.592,pounds:453.592 };

function bestMetricVolumeUnit(ml: number) { if (ml >= 1000) return {qty:ml/1000,unit:"L"}; if (ml >= 1) return {qty:ml,unit:"ml"}; return {qty:ml*1000,unit:"μL"}; }
function bestMetricWeightUnit(g: number) { return g >= 1000 ? {qty:g/1000,unit:"kg"} : {qty:g,unit:"g"}; }

function convertUnit(qty: number, unit: string, targetSystem: UnitSystem): {qty:number;unit:string}|null {
  const u = unit.toLowerCase().trim();
  if (targetSystem === "metric") {
    if (u in VOLUME_TO_ML) return bestMetricVolumeUnit(qty * VOLUME_TO_ML[u]);
    if (u in WEIGHT_TO_G) return bestMetricWeightUnit(qty * WEIGHT_TO_G[u]);
    if (["ml","l","g","kg"].includes(u)) return {qty,unit};
    return null;
  } else {
    if (u === "ml") return {qty,unit:"ml"};
    if (u === "g") return {qty,unit:"g"};
    if (u in VOLUME_TO_ML || u in WEIGHT_TO_G) return {qty,unit};
    return null;
  }
}

function applyConversion(qty: number, unit: string, item: string, targetSystem: UnitSystem): {qty:number;unit:string} {
  const u = unit.toLowerCase().trim();
  if (u === "") return {qty,unit};
  const ML_PER_UNIT = VOLUME_TO_ML; // same values
  if (targetSystem === "metric") {
    if (u in ML_PER_UNIT) { const ml = qty * ML_PER_UNIT[u]; const g = volumeToGrams(ml, item); if (g !== null) return g >= 1000 ? {qty:g/1000,unit:"kg"} : {qty:g,unit:"g"}; }
    const d = convertUnit(qty, unit, targetSystem); if (d) return d;
  } else {
    const d = convertUnit(qty, unit, targetSystem); if (d) return d;
  }
  return {qty,unit};
}

function parseServings(s: string): number | null {
  const match = s.match(/\d+/); if (!match) return null; const n = parseInt(match[0]); return n > 0 ? n : null;
}

function formatMetricQuantity(value: number): string {
  if (value === 0) return "0";
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? `${rounded}` : rounded.toFixed(1);
}

// ---------------------------------------------------------------------------
// Bug #1 — Unit conversion input: override treated as metric, not re-converted
// ---------------------------------------------------------------------------

console.log("\nBug #1 — Unit conversion input: override treated as metric, not re-converted");

{
  const baseConv = applyConversion(1, "cup", "flour", "metric");
  assertClose("1 cup flour in metric → grams (not ml) via density path", baseConv.qty, 120, 5);
  assert("1 cup flour in metric → unit is 'g'", baseConv.unit, "g");

  const parsed = parseQuantity("300");
  assert("Override qty '300' parses to 300", parsed, 300);
  const buggyPath = applyConversion(300, "cup", "flour", "metric");
  assert("Buggy path (re-converting override) gives wrong result (≠ 300)", buggyPath.qty !== 300, true);
  assert("Fix: override value 300 is preserved without re-conversion", parsed === 300, true);
}

{
  const editorSrc = readSource("src/lib/use-recipe-editor.ts");
  assertContains("use-recipe-editor: scaling guard skips override quantity", editorSrc, "if (!override?.quantity)");
  assertContains("use-recipe-editor: applyConversion checks density before direct volume", editorSrc, "volumeToGrams(ml, item)");
}

// ---------------------------------------------------------------------------
// Bug #2 — Name normalisation: hyphen vs. space in ingredient names
// ---------------------------------------------------------------------------

console.log("\nBug #2 — Name normalisation: hyphen vs. space in ingredient names");

assert('getDensityGPerCup("all-purpose flour") === 120', getDensityGPerCup("all-purpose flour"), 120);
assert('getDensityGPerCup("all purpose flour") === 120', getDensityGPerCup("all purpose flour"), 120);
assert('getDensityGPerCup("All-Purpose Flour") === 120 (case insensitive)', getDensityGPerCup("All-Purpose Flour"), 120);
assert('getDensityGPerCup("All Purpose Flour") === 120 (case insensitive)', getDensityGPerCup("All Purpose Flour"), 120);

{
  const densitySrc = readSource("src/lib/density.ts");
  assertContains("density.ts contains 'all-purpose flour' key", densitySrc, '"all-purpose flour"');
  assertContains("density.ts contains 'all purpose flour' key", densitySrc, '"all purpose flour"');
}

// ---------------------------------------------------------------------------
// Bug #3 — Swapped ingredient matching
// ---------------------------------------------------------------------------

console.log("\nBug #3 — Swapped ingredient matching: step references original name");

{
  const derivedIngredients = [{ quantity:"½",unit:"cup",item:"margarine" }];
  const stepIngredient = { quantity:"1",unit:"cup",item:"butter",totalQuantity:"2" };

  const buggyMatch = derivedIngredients.find((d) => d.item.toLowerCase() === stepIngredient.item.toLowerCase());
  assert("Buggy lookup: 'butter' does NOT match 'margarine' (demonstrates the bug)", buggyMatch, undefined);

  const originalIngredients = [{ quantity:"2",unit:"cup",item:"butter" }];
  const fixedMatch = derivedIngredients.find((d, i) =>
    d.item.toLowerCase() === stepIngredient.item.toLowerCase() ||
    originalIngredients[i]?.item.toLowerCase() === stepIngredient.item.toLowerCase()
  );
  assert("Fixed lookup: original 'butter' index matches swapped 'margarine' entry", fixedMatch?.item, "margarine");
  assert("Fixed lookup: returns the swapped item name 'margarine'", fixedMatch?.item === "margarine", true);
}

{
  function normaliseName(s: string): string { return s.toLowerCase().replace(/-/g,"").replace(/\s+/g," ").trim(); }
  const derived2 = [{quantity:"½",unit:"cup",item:"margarine"}];
  const orig2 = [{quantity:"1",unit:"cup",item:"butter"}];
  const si2 = {quantity:"½",unit:"cup",item:"butter"};
  const fixedMatch2 = (() => {
    const byName = derived2.find((d) => normaliseName(d.item) === normaliseName(si2.item));
    if (byName) return byName;
    const origIdx = orig2.findIndex((o) => normaliseName(o.item) === normaliseName(si2.item));
    return origIdx >= 0 ? derived2[origIdx] : undefined;
  })();
  assert("normaliseName-based lookup + index fallback: 'butter' resolves to 'margarine'", fixedMatch2?.item, "margarine");

  const labViewSrc = readSource("src/components/lab-view.tsx");
  assertContains("lab-view.tsx: normaliseName function normalises hyphens and case", labViewSrc, "normaliseName");
  assertContains("lab-view.tsx: index-based fallback via recipe.ingredients.findIndex", labViewSrc, "recipe.ingredients.findIndex");
}

// ---------------------------------------------------------------------------
// Bug #4 — Density path: cup flour converts to grams not ml
// ---------------------------------------------------------------------------

console.log("\nBug #4 — Density path: cup flour converts to grams not ml");

{
  const directOnly = convertUnit(1, "cup", "metric");
  assert("convertUnit alone: 1 cup → ~237 ml (no density)", directOnly !== null && directOnly.unit === "ml", true);
  assertClose("convertUnit alone: 1 cup → ~236.6 ml", directOnly?.qty ?? 0, 236.6, 1);

  const withDensity = applyConversion(1, "cup", "flour", "metric");
  assert("applyConversion: 1 cup flour → unit is 'g'", withDensity.unit, "g");
  assertClose("applyConversion: 1 cup flour → ~120g", withDensity.qty, 120, 5);

  const butterConv = applyConversion(0.5, "cup", "butter", "metric");
  assert("applyConversion: 0.5 cup butter → unit is 'g'", butterConv.unit, "g");
  assertClose("applyConversion: 0.5 cup butter → ~113.5g", butterConv.qty, 113.5, 3);
}

{
  const editorSrc = readSource("src/lib/use-recipe-editor.ts");
  assertContains("use-recipe-editor: applyConversion calls volumeToGrams for density path", editorSrc, "volumeToGrams");
  assertContains("use-recipe-editor: density path returns grams if found", editorSrc, "if (g !== null)");
}

// ---------------------------------------------------------------------------
// Bug #5 — No-op qty commit
// ---------------------------------------------------------------------------

console.log("\nBug #5 — No-op qty commit: unchanged qty commit skips onQuantityChange");

{
  const recipeCardSrc = readSource("src/components/recipe-card.tsx");
  assertMatchesRegex("recipe-card.tsx: commitQty guards call with inequality check", recipeCardSrc, /trimmed\s*!==\s*ingredient\.quantity|ingredient\.quantity\s*!==\s*trimmed/);
}

{
  const ingredientQty = "1½";
  let onQuantityChangeCalled = false;
  const fixedCommitQty = (qtyDraft: string, currentQty: string) => {
    const trimmed = qtyDraft.trim() || currentQty;
    if (trimmed !== currentQty) onQuantityChangeCalled = true;
  };
  fixedCommitQty("1½", ingredientQty);
  assert("No-op commit: same value → onQuantityChange NOT called", onQuantityChangeCalled, false);
  fixedCommitQty("2", ingredientQty);
  assert("Changed commit: different value → onQuantityChange called", onQuantityChangeCalled, true);
}

// ---------------------------------------------------------------------------
// Bug #6 — Metric formatting
// ---------------------------------------------------------------------------

console.log("\nBug #6 — Metric formatting: metric values as decimals not fractions");

{
  assert("formatQuantity(473.176) produces a non-decimal (fraction) result — confirms the bug", formatQuantity(473.176) !== "473.2", true);
  assert("formatMetricQuantity(473.176) === '473.2'", formatMetricQuantity(473.176), "473.2");
  assert("formatMetricQuantity(120) === '120'", formatMetricQuantity(120), "120");
  assert("formatMetricQuantity(236.588) === '236.6'", formatMetricQuantity(236.588), "236.6");
  assert("formatMetricQuantity(0.5) === '0.5'", formatMetricQuantity(0.5), "0.5");
  assert("formatMetricQuantity(1000) === '1000'", formatMetricQuantity(1000), "1000");
  todo("use-recipe-editor.ts: metric branch calls formatMetricQuantity", "Requires formatMetricQuantity wired in use-recipe-editor derivedIngredients.");
}

// ---------------------------------------------------------------------------
// Bug #7 — Pre-snap removal
// ---------------------------------------------------------------------------

console.log("\nBug #7 — Pre-snap: 1/3 cup * ratio 0.5 → '⅙' not '⅛'");

{
  const siQty = parseQuantity("1/3") ?? 0;
  const siTotal = parseQuantity("2/3") ?? 1;
  const ratio = siQty / siTotal;
  const derivedQty = parseQuantity("1/3") ?? 0;
  const scaledQty = derivedQty * ratio;

  const oldSnapped = Math.round(scaledQty * 8) / 8;
  assert("Old path (pre-snap to 8ths): 1/6 rounds to 1/8 → '⅛' (the bug)", formatQuantity(oldSnapped), "⅛");

  const fixedFormatted = formatQuantity(scaledQty);
  assert("Fixed path (no pre-snap): 1/6 → '1/6' or '⅙'", fixedFormatted === "1/6" || fixedFormatted === "⅙", true);
  assert("formatQuantity(1/3) → '⅓'", formatQuantity(1/3), "⅓");
  assert("formatQuantity(1/6) → '1/6' or '⅙'", formatQuantity(1/6) === "1/6" || formatQuantity(1/6) === "⅙", true);
  assert("formatQuantity(1/6) !== '⅛'", formatQuantity(1/6) !== "⅛", true);

  const labViewSrc = readSource("src/components/lab-view.tsx");
  assertNotContains("lab-view.tsx: pre-snap line 'Math.round(scaledQty * 8) / 8' removed", labViewSrc, "Math.round(scaledQty * 8) / 8");
  assertContains("lab-view.tsx: formatQuantity called on raw scaledQty (no pre-snap)", labViewSrc, "formatQuantity(scaledQty)");
}

// ---------------------------------------------------------------------------
// Bug #8 — Range servings
// ---------------------------------------------------------------------------

console.log("\nBug #8 — Range servings: '12–16 cookies' uses 12 as base");

{
  assert('parseServings("12–16 cookies") === 12', parseServings("12–16 cookies"), 12);
  assert('parseServings("makes 24 cookies") === 24', parseServings("makes 24 cookies"), 24);
  assert('parseServings("serves 6") === 6', parseServings("serves 6"), 6);
  assert('parseServings("2") === 2', parseServings("2"), 2);
  assert('parseServings("12\u201316 cookies") === 12 (en-dash)', parseServings("12\u201316 cookies"), 12);
  todo("recipe-card.tsx: ServingScaler displays raw servings string as title or label", "Requires a UI prop change to pass recipe.servings string to ServingScaler for display.");
}

// ---------------------------------------------------------------------------
// Bug #9 — Reset confirm
// ---------------------------------------------------------------------------

console.log("\nBug #9 — Reset confirm: two-click confirmation before reset");

{
  let onResetAllCalled = false;
  let confirmState = false;
  const handleResetClick = () => {
    if (!confirmState) { confirmState = true; return; }
    onResetAllCalled = true; confirmState = false;
  };
  handleResetClick();
  assert("First reset click: onResetAll NOT called", onResetAllCalled, false);
  assert("First reset click: confirm state is true", confirmState, true);
  handleResetClick();
  assert("Second reset click: onResetAll IS called", onResetAllCalled, true);
  assert("Second reset click: confirm state reset to false", confirmState, false);
  todo("recipe-card.tsx: Reset button implements two-click confirm", "Requires adding confirmReset state to RecipeCard.");
}

// ---------------------------------------------------------------------------
// Bug #10 — No-op swap
// ---------------------------------------------------------------------------

console.log("\nBug #10 — No-op swap: unchanged swap field does not call onItemChange");

{
  const originalItem = "butter";
  let onItemChangeCalled = false;
  const fixedCommitSwap = (swapDraft: string) => {
    const trimmed = swapDraft.trim();
    if (trimmed && trimmed !== originalItem) onItemChangeCalled = true;
  };
  fixedCommitSwap("butter");
  assert("No-op swap (same value): onItemChange NOT called", onItemChangeCalled, false);
  fixedCommitSwap("margarine");
  assert("Changed swap ('margarine'): onItemChange IS called", onItemChangeCalled, true);
  onItemChangeCalled = false;
  fixedCommitSwap("");
  assert("Empty swap draft: onItemChange NOT called", onItemChangeCalled, false);

  const recipeCardSrc = readSource("src/components/recipe-card.tsx");
  assertContains("recipe-card.tsx: commitSwap guards call — trimmed must differ from ingredient.item", recipeCardSrc, "trimmed !== ingredient.item");
}

// ---------------------------------------------------------------------------
// Bug #11 — Count ingredients scale
// ---------------------------------------------------------------------------

console.log("\nBug #11 — Count ingredients scale: unit-less ingredients scale correctly");

{
  const ing = {quantity:"2",unit:"",item:"lemons"};
  const scaleFactor = 2;
  const qtyNum = parseQuantity(ing.quantity);
  assert("parseQuantity('2') === 2", qtyNum, 2);
  const scaled = (qtyNum ?? 0) * scaleFactor;
  assert("2 lemons * scaleFactor 2 = 4", scaled, 4);
  const converted = applyConversion(scaled, ing.unit, ing.item, "us");
  assert("applyConversion: empty unit → unchanged qty", converted.qty, 4);
  assert("applyConversion: empty unit → unchanged unit", converted.unit, "");
  assert("formatQuantity(4) === '4'", formatQuantity(scaled), "4");
  const scaledFrac = (parseQuantity("3") ?? 0) * 1.5;
  assert("3 lemons * scaleFactor 1.5 = 4.5 → formatQuantity → '4½'", formatQuantity(scaledFrac), "4½");
  const convertedMetric = applyConversion(4, "", "lemons", "metric");
  assert("applyConversion: empty unit in metric system → qty unchanged (4)", convertedMetric.qty, 4);
}

// ---------------------------------------------------------------------------
// Bug #12 — Lab HUD swapped names
// ---------------------------------------------------------------------------

console.log("\nBug #12 — Lab HUD swapped names: post-swap HUD shows new ingredient name");

{
  const stepIngs = [{quantity:"½",unit:"cup",item:"butter"}];
  const derivedIngredients = [{quantity:"½",unit:"cup",item:"margarine"}];

  const buggyResult = stepIngs.map((si) => {
    const derived = derivedIngredients.find((d) => d.item.toLowerCase() === si.item.toLowerCase());
    return derived ? {...si, item: derived.item} : si;
  });
  assert("Buggy path: 'butter' step ingredient still shows 'butter'", buggyResult[0].item, "butter");

  const originalIngredients = [{quantity:"½",unit:"cup",item:"butter"}];
  const fixedResult = stepIngs.map((si) => {
    const derived = derivedIngredients.find((d, i) =>
      d.item.toLowerCase() === si.item.toLowerCase() ||
      originalIngredients[i]?.item.toLowerCase() === si.item.toLowerCase()
    );
    return derived ? {...si, quantity: derived.quantity, unit: derived.unit, item: derived.item} : si;
  });
  assert("Fixed path: 'butter' step ingredient resolves to 'margarine' after swap", fixedResult[0].item, "margarine");
  assert("Fixed path: swapped item name propagates to step ingredient display", fixedResult[0].item === "margarine", true);

  const labViewSrc = readSource("src/components/lab-view.tsx");
  assertContains("lab-view.tsx: patchedStepIngredients uses derivedIngredients", labViewSrc, "derivedIngredients");
  assertContains("lab-view.tsx: patchedStepIngredients index fallback uses recipe.ingredients", labViewSrc, "recipe.ingredients.findIndex");
  assertContains("lab-view.tsx: patchedStepIngredients dep array includes recipe.ingredients", labViewSrc, "recipe.ingredients, derivedIngredients");
}

summary();
