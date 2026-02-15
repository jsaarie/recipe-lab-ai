"use client";

import { useState } from "react";
import type { ParsedRecipe } from "@/types/recipe";

function MetaPill({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#7C9070]/10 px-2.5 py-1 text-xs text-[#5A6B50] sm:gap-1.5 sm:px-3 sm:text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-neutral-500">{value}</span>
    </span>
  );
}

function CheckableIngredient({ text }: { text: string }) {
  const [checked, setChecked] = useState(false);

  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
        className="h-4 w-4 rounded border-neutral-300 text-[#7C9070] accent-[#7C9070]"
      />
      <span
        className={`text-base transition-colors ${checked ? "text-neutral-400 line-through" : "text-neutral-700"}`}
      >
        {text}
      </span>
    </label>
  );
}

function formatIngredient(ing: { quantity: string; unit: string; item: string }): string {
  return [ing.quantity, ing.unit, ing.item].filter(Boolean).join(" ");
}

export function RecipeCard({ recipe, source }: { recipe: ParsedRecipe; source?: "structured" | "ai" }) {
  return (
    <div className="w-full max-w-2xl space-y-5 sm:space-y-8">
      {/* Title */}
      <div className="space-y-2 text-center sm:space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-800 sm:text-3xl">
          {recipe.title}
        </h2>
        <div className="flex items-center justify-center gap-3">
          <a
            href={recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#7C9070] underline underline-offset-2 hover:text-[#6B7F60]"
          >
            View original recipe
          </a>
          {source === "ai" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                <path d="M8 10a2.5 2.5 0 0 0 0 5" />
                <path d="M16 10a2.5 2.5 0 0 1 0 5" />
              </svg>
              AI extracted
            </span>
          )}
        </div>
      </div>

      {/* Meta Pills */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        <MetaPill label="Prep" value={recipe.prepTime} />
        <MetaPill label="Cook" value={recipe.cookTime} />
        <MetaPill label="Total" value={recipe.totalTime} />
        <MetaPill label="Servings" value={recipe.servings} />
      </div>

      <hr className="border-neutral-200" />

      {/* Ingredients */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-neutral-700">Ingredients</h3>
        <div className="space-y-0.5">
          {recipe.ingredients.map((ing, i) => (
            <CheckableIngredient key={i} text={formatIngredient(ing)} />
          ))}
        </div>
      </div>

      <hr className="border-neutral-200" />

      {/* Instructions */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-lg font-semibold text-neutral-700">Instructions</h3>
        <ol className="space-y-3 sm:space-y-4">
          {recipe.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7C9070]/10 text-xs font-semibold text-[#5A6B50] sm:h-7 sm:w-7 sm:text-sm">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-neutral-700 sm:text-base">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <>
          <hr className="border-neutral-200" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-neutral-700">Notes</h3>
            <p className="text-base leading-relaxed text-neutral-600">
              {recipe.notes}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
