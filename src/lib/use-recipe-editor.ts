"use client";

import { useState, useMemo, useCallback } from "react";
import type { ParsedRecipe, Ingredient } from "@/types/recipe";
import { parseQuantity, formatQuantity, formatMetricQuantity } from "@/lib/fractions";
import { convertUnit, convertTemperatures, type UnitSystem } from "@/lib/conversions";
export type { UnitSystem } from "@/lib/conversions";
import { volumeToGrams, gramsToVolume } from "@/lib/density";

export interface IngredientOverride {
  quantity?: string;   // user-edited quantity (raw string)
  item?: string;       // user-swapped ingredient name
  wasSwapped?: boolean;
}

export interface RecipeEditorState {
  /** Current servings (edited by user) */
  servings: number;
  /** Original servings parsed from recipe string (e.g. "4 servings" → 4) */
  originalServings: number;
  /** Per-ingredient overrides keyed by index */
  ingredientOverrides: Map<number, IngredientOverride>;
  /** Active unit system */
  unitSystem: UnitSystem;
  /** Derived (fully computed) ingredient list */
  derivedIngredients: Ingredient[];
  /** Derived instructions with temperature conversions applied */
  derivedInstructions: string[];
  /** Change handlers */
  setServings: (n: number) => void;
  setIngredientQuantity: (index: number, qty: string) => void;
  setIngredientItem: (index: number, item: string) => void;
  clearIngredientSwap: (index: number) => void;
  setUnitSystem: (system: UnitSystem) => void;
  resetAll: () => void;
}

/**
 * Parse a servings string like "4 servings", "makes 24 cookies", "serves 6", "2" → number.
 * Returns null if no number found.
 */
function parseServings(s: string): number | null {
  const match = s.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0]);
  return n > 0 ? n : null;
}

/**
 * Apply unit conversion to a single ingredient (quantity + unit).
 * Also handles Weight ↔ Volume via density lookup when a match exists.
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
    // Prefer density-based weight conversion over bare volume conversion
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
    // Metric weight → try density-based volume first
    if (unitLower === "g" || unitLower === "kg") {
      const grams = unitLower === "kg" ? qty * 1000 : qty;
      const ml = gramsToVolume(grams, item);
      if (ml !== null) {
        if (ml >= 236.588 * 0.9) return { qty: ml / 236.588, unit: "cup" };
        if (ml >= 14.7868 * 0.75) return { qty: ml / 14.7868, unit: "tbsp" };
        return { qty: ml / 4.92892, unit: "tsp" };
      }
    }
    // Fall back to direct unit conversion (ml → tsp, etc.)
    const direct = convertUnit(qty, unit, targetSystem);
    if (direct) return direct;
  }

  // No conversion available — return unchanged
  return { qty, unit };
}

export interface RecipeEditorOptions {
  initialUnitSystem?: UnitSystem;
  initialServings?: number;
  initialIngredientSwaps?: Record<number, string>;
}

export function useRecipeEditor(recipe: ParsedRecipe, options: RecipeEditorOptions = {}): RecipeEditorState {
  const originalServings = useMemo(
    () => parseServings(recipe.servings) ?? 1,
    [recipe.servings],
  );

  const [servings, setServingsState] = useState<number>(options.initialServings ?? originalServings);
  const [ingredientOverrides, setIngredientOverrides] = useState<Map<number, IngredientOverride>>(() => {
    if (!options.initialIngredientSwaps) return new Map();
    const map = new Map<number, IngredientOverride>();
    for (const [k, v] of Object.entries(options.initialIngredientSwaps)) {
      map.set(Number(k), { item: v, wasSwapped: true });
    }
    return map;
  });
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(options.initialUnitSystem ?? "us");

  const scaleFactor = originalServings > 0 ? servings / originalServings : 1;

  /** Derive the final ingredient list from base + overrides + scaling + conversion */
  const derivedIngredients = useMemo<Ingredient[]>(() => {
    const isMetric = unitSystem === "metric";
    const fmt = isMetric ? formatMetricQuantity : formatQuantity;

    return recipe.ingredients.map((ing, i) => {
      const override = ingredientOverrides.get(i);
      const item = override?.item ?? ing.item;

      // Determine effective quantity string (override takes precedence)
      const quantityStr = override?.quantity ?? ing.quantity;

      // Parse to number for scaling
      let qtyNum = parseQuantity(quantityStr);
      if (qtyNum === null) {
        // Unparseable (e.g. "to taste") — pass through
        return { quantity: quantityStr, unit: ing.unit, item };
      }

      // Apply serving scale (only if no manual quantity override)
      if (!override?.quantity) {
        qtyNum = qtyNum * scaleFactor;
      }

      // When there's a quantity override and metric is active, interpret the
      // override value in the unit the ingredient is currently displayed in
      // (not the original US unit), so the user-typed number makes sense.
      let effectiveUnit = ing.unit;
      if (override?.quantity && isMetric) {
        const baseQty = parseQuantity(ing.quantity);
        if (baseQty !== null) {
          const baseConverted = applyConversion(baseQty * scaleFactor, ing.unit, item, unitSystem);
          effectiveUnit = baseConverted.unit;
        }
      }

      // Apply unit conversion
      const converted = applyConversion(qtyNum, effectiveUnit, item, unitSystem);

      return {
        quantity: fmt(converted.qty),
        unit: converted.unit,
        item,
      };
    });
  }, [recipe.ingredients, ingredientOverrides, scaleFactor, unitSystem]);

  /** Derive instructions with temperature strings converted */
  const derivedInstructions = useMemo<string[]>(() => {
    if (unitSystem === "us") return recipe.instructions;
    return recipe.instructions.map((step) => convertTemperatures(step, unitSystem));
  }, [recipe.instructions, unitSystem]);

  const setServings = useCallback((n: number) => {
    if (n > 0) setServingsState(n);
  }, []);

  const setIngredientQuantity = useCallback((index: number, qty: string) => {
    setIngredientOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(index) ?? {};
      next.set(index, { ...existing, quantity: qty });
      return next;
    });
  }, []);

  const setIngredientItem = useCallback((index: number, item: string) => {
    setIngredientOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(index) ?? {};
      next.set(index, { ...existing, item, wasSwapped: true });
      return next;
    });
  }, []);

  const clearIngredientSwap = useCallback((index: number) => {
    setIngredientOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(index);
      if (existing) {
        const rest: IngredientOverride = Object.fromEntries(
          Object.entries(existing).filter(([k]) => k !== "item" && k !== "wasSwapped")
        ) as IngredientOverride;
        if (Object.keys(rest).length === 0) {
          next.delete(index);
        } else {
          next.set(index, rest);
        }
      }
      return next;
    });
  }, []);

  const setUnitSystem = useCallback((system: UnitSystem) => setUnitSystemState(system), []);

  const resetAll = useCallback(() => {
    setServingsState(originalServings);
    setIngredientOverrides(new Map());
    setUnitSystemState("us");
  }, [originalServings]);

  return {
    servings,
    originalServings,
    ingredientOverrides,
    unitSystem,
    derivedIngredients,
    derivedInstructions,
    setServings,
    setIngredientQuantity,
    setIngredientItem,
    clearIngredientSwap,
    setUnitSystem,
    resetAll,
  };
}
