"use client";

import { useState } from "react";
import { RecipeInput } from "@/components/recipe-input";
import { RecipeCard } from "@/components/recipe-card";
import type { ParsedRecipe } from "@/types/recipe";

export function HomePage() {
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [loading, setLoading] = useState(false);

  const hasRecipe = recipe !== null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FAF8F5] px-4">
      {/* Hero state: centered */}
      {!hasRecipe && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-700 sm:text-5xl">
            Recipe Lab <span className="text-[#7C9070]">AI</span>
          </h1>
          <RecipeInput
            onRecipeParsed={setRecipe}
            onLoading={setLoading}
          />
        </div>
      )}

      {/* Loading state: centered */}
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-700">
            Recipe Lab <span className="text-[#7C9070]">AI</span>
          </h1>
          <div className="flex items-center gap-3 text-neutral-500">
            <svg
              className="h-5 w-5 animate-spin text-[#7C9070]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Extracting recipe...
          </div>
        </div>
      )}

      {/* Recipe state: compact input at top, recipe below */}
      {hasRecipe && !loading && (
        <>
          <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-[#FAF8F5]/95 px-3 py-3 backdrop-blur-sm">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 sm:flex-row sm:gap-4">
              <span className="text-lg font-bold text-neutral-700">
                Recipe Lab <span className="text-[#7C9070]">AI</span>
              </span>
              <RecipeInput
                compact
                onRecipeParsed={setRecipe}
                onLoading={setLoading}
              />
            </div>
          </header>
          <main className="w-full max-w-2xl px-1 py-6 sm:py-10">
            <RecipeCard recipe={recipe} />
          </main>
        </>
      )}
    </div>
  );
}
