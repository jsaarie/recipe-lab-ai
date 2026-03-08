/**
 * Unit conversion utilities for Recipe Lab AI v2.1.
 * Handles US ↔ Metric volume/weight and F ↔ C temperature conversions.
 */

export type UnitSystem = "us" | "metric";

/** Canonical unit name → metric equivalent (volume) */
const VOLUME_TO_ML: Record<string, number> = {
  // US volume
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  "fl oz": 29.5735,
  "fluid ounce": 29.5735,
  "fluid ounces": 29.5735,
  cup: 236.588,
  cups: 236.588,
  pt: 473.176,
  pint: 473.176,
  pints: 473.176,
  qt: 946.353,
  quart: 946.353,
  quarts: 946.353,
  gal: 3785.41,
  gallon: 3785.41,
  gallons: 3785.41,
};

/** Canonical unit name → grams (weight) */
const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

/** Choose the best metric volume unit for a given ml amount */
function bestMetricVolumeUnit(ml: number): { qty: number; unit: string } {
  if (ml >= 1000) return { qty: ml / 1000, unit: "L" };
  if (ml >= 1) return { qty: ml, unit: "ml" };
  return { qty: ml * 1000, unit: "μL" }; // edge case
}

/** Choose the best metric weight unit for a given gram amount */
function bestMetricWeightUnit(g: number): { qty: number; unit: string } {
  if (g >= 1000) return { qty: g / 1000, unit: "kg" };
  return { qty: g, unit: "g" };
}

/** Choose the best US volume unit for a given ml amount */
function bestUSVolumeUnit(ml: number): { qty: number; unit: string } {
  if (ml >= VOLUME_TO_ML.gal * 0.9) return { qty: ml / VOLUME_TO_ML.gal, unit: "gal" };
  if (ml >= VOLUME_TO_ML.qt * 0.9) return { qty: ml / VOLUME_TO_ML.qt, unit: "qt" };
  if (ml >= VOLUME_TO_ML.pt * 0.9) return { qty: ml / VOLUME_TO_ML.pt, unit: "pt" };
  if (ml >= VOLUME_TO_ML.cup * 0.9) return { qty: ml / VOLUME_TO_ML.cup, unit: "cup" };
  if (ml >= VOLUME_TO_ML.tbsp * 0.75) return { qty: ml / VOLUME_TO_ML.tbsp, unit: "tbsp" };
  return { qty: ml / VOLUME_TO_ML.tsp, unit: "tsp" };
}

/** Choose the best US weight unit for a given gram amount */
function bestUSWeightUnit(g: number): { qty: number; unit: string } {
  if (g >= WEIGHT_TO_G.lb * 0.9) return { qty: g / WEIGHT_TO_G.lb, unit: "lb" };
  return { qty: g / WEIGHT_TO_G.oz, unit: "oz" };
}

/**
 * Convert a quantity+unit pair to the target unit system.
 * Returns null if the unit is not recognized (e.g. "pinch", "clove", "bunch").
 */
export function convertUnit(
  qty: number,
  unit: string,
  targetSystem: UnitSystem,
): { qty: number; unit: string } | null {
  const unitLower = unit.toLowerCase().trim();

  if (targetSystem === "metric") {
    // US volume → metric
    if (unitLower in VOLUME_TO_ML) {
      const ml = qty * VOLUME_TO_ML[unitLower];
      return bestMetricVolumeUnit(ml);
    }
    // US weight → metric
    if (unitLower in WEIGHT_TO_G) {
      const g = qty * WEIGHT_TO_G[unitLower];
      return bestMetricWeightUnit(g);
    }
    // Already metric or unknown
    if (["ml", "l", "g", "kg"].includes(unitLower)) return { qty, unit };
    return null;
  } else {
    // metric → US volume
    if (unitLower === "ml") {
      return bestUSVolumeUnit(qty);
    }
    if (unitLower === "l") {
      return bestUSVolumeUnit(qty * 1000);
    }
    // metric → US weight
    if (unitLower === "g") {
      return bestUSWeightUnit(qty);
    }
    if (unitLower === "kg") {
      return bestUSWeightUnit(qty * 1000);
    }
    // Already US or unknown
    if (unitLower in VOLUME_TO_ML || unitLower in WEIGHT_TO_G) return { qty, unit };
    return null;
  }
}

/**
 * Convert a Fahrenheit temperature to Celsius and round to nearest 5°C.
 */
function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9 / 5) * 5;
}

/**
 * Convert a Celsius temperature to Fahrenheit and round to nearest 5°F.
 */
function cToF(c: number): number {
  return Math.round(((c * 9) / 5 + 32) / 5) * 5;
}

/**
 * Replace temperature mentions in an instruction string.
 * US→Metric: "350°F" → "175°C" (also "350 F", "350 degrees F")
 * Metric→US: "180°C" → "355°F"
 */
export function convertTemperatures(text: string, targetSystem: UnitSystem): string {
  if (targetSystem === "metric") {
    return text.replace(
      /(\d+(?:\.\d+)?)\s*°?\s*F(?:ahrenheit)?/gi,
      (_, val) => `${fToC(parseFloat(val))}°C`,
    );
  } else {
    return text.replace(
      /(\d+(?:\.\d+)?)\s*°?\s*C(?:elsius)?/gi,
      (_, val) => `${cToF(parseFloat(val))}°F`,
    );
  }
}

