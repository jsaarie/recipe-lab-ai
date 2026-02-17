"use client";

import { Check } from "lucide-react";
import type { StepIngredient } from "@/types/recipe";

interface StepIngredientsProps {
  ingredients: StepIngredient[];
  checkedSet: Set<number>;
  onToggle: (ingredientIndex: number) => void;
}

export function StepIngredients({
  ingredients,
  checkedSet,
  onToggle,
}: StepIngredientsProps) {
  if (ingredients.length === 0) return null;

  const allChecked =
    ingredients.length > 0 && ingredients.every((_, i) => checkedSet.has(i));

  return (
    <div
      className={`mt-4 rounded-lg border p-3 transition-colors ${
        allChecked
          ? "border-[#7C9070]/30 bg-[#7C9070]/5"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <div className="space-y-2">
        {ingredients.map((ing, i) => {
          const checked = checkedSet.has(i);
          const label = formatIngredient(ing);
          const hasSplit = ing.totalQuantity && ing.totalUnit;

          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(i);
                if (navigator.vibrate) navigator.vibrate(10);
              }}
              className="flex w-full items-start gap-2.5 text-left"
            >
              <span
                className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                  checked
                    ? "border-[#7C9070] bg-[#7C9070]"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {checked && <Check className="size-3 text-white" strokeWidth={3} />}
              </span>
              <span
                className={`text-sm leading-snug transition-colors ${
                  checked
                    ? "text-neutral-400 line-through"
                    : "text-neutral-700"
                }`}
              >
                {label}
                {hasSplit && (
                  <span className="ml-1 text-xs text-neutral-400">
                    (of {ing.totalQuantity} {ing.totalUnit})
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatIngredient(ing: StepIngredient): string {
  const parts: string[] = [];
  if (ing.quantity) parts.push(ing.quantity);
  if (ing.unit) parts.push(ing.unit);
  if (ing.item) parts.push(ing.item);
  return parts.join(" ");
}
