"use client";

import { useState, useCallback } from "react";
import { RecipeInput } from "@/components/recipe-input";
import { RecipeCard } from "@/components/recipe-card";
import { LabBanner } from "@/components/lab-banner";
import { LabView } from "@/components/lab-view";
import { LabComplete } from "@/components/lab-complete";
import type { ParsedRecipe, StepIngredient } from "@/types/recipe";

type View = "recipe" | "lab" | "complete";

export function HomePage() {
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [recipeSource, setRecipeSource] = useState<"structured" | "ai">("structured");
  const [loading, setLoading] = useState(false);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [view, setView] = useState<View>("recipe");
  const [labStep, setLabStep] = useState(0);

  const hasRecipe = recipe !== null;

  const handleRecipeParsed = useCallback((r: ParsedRecipe, s: "structured" | "ai") => {
    setRecipe(r);
    setRecipeSource(s);
    setView("recipe");
    setLabStep(0);
    setIngredientsLoading(s === "structured");
  }, []);

  const handleStepIngredientsMapped = useCallback((si: StepIngredient[][] | null) => {
    setIngredientsLoading(false);
    if (si) {
      setRecipe((prev) => (prev ? { ...prev, stepIngredients: si } : prev));
    }
  }, []);

  const handleEnterLab = useCallback(() => {
    setView("lab");
  }, []);

  const handleExitLab = useCallback(() => {
    setView("recipe");
  }, []);

  const handleLabComplete = useCallback(() => {
    setView("complete");
  }, []);

  const handleViewRecipe = useCallback(() => {
    setView("recipe");
  }, []);

  const handleCookAnother = useCallback(() => {
    setRecipe(null);
    setView("recipe");
    setLabStep(0);
  }, []);

  // Lab HUD — full-screen, replaces everything
  if (hasRecipe && view === "lab") {
    return (
      <LabView
        recipe={recipe}
        initialStep={labStep}
        onExitLab={handleExitLab}
        onComplete={handleLabComplete}
      />
    );
  }

  // Recipe Complete — full-screen celebration
  if (hasRecipe && view === "complete") {
    return (
      <LabComplete
        recipe={recipe}
        onViewRecipe={handleViewRecipe}
        onCookAnother={handleCookAnother}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FAF8F5] px-4">
      {/* Hero state: centered */}
      {!hasRecipe && !loading && (
        <div className="flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-700 sm:text-5xl">
              Recipe Lab <span className="text-[#7C9070]">AI</span>
            </h1>
            <p className="text-base text-neutral-500 sm:text-lg">
              Stop Scrolling. Start Cooking.
            </p>
          </div>
          <div className="w-full space-y-3">
            <RecipeInput
              onRecipeParsed={handleRecipeParsed}
              onLoading={setLoading}
              onStepIngredientsMapped={handleStepIngredientsMapped}
            />
            <p className="text-center text-sm text-neutral-400">
              Paste any recipe URL to remove the clutter and get straight to the kitchen.
            </p>
          </div>
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

      {/* Recipe state: compact input at top, banner, recipe below */}
      {hasRecipe && !loading && view === "recipe" && (
        <>
          <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-[#FAF8F5]/95 px-3 py-3 backdrop-blur-sm">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 sm:flex-row sm:gap-4">
              <span className="text-lg font-bold text-neutral-700">
                Recipe Lab <span className="text-[#7C9070]">AI</span>
              </span>
              <RecipeInput
                compact
                onRecipeParsed={handleRecipeParsed}
                onLoading={setLoading}
                onStepIngredientsMapped={handleStepIngredientsMapped}
              />
            </div>
          </header>
          <main className="w-full max-w-2xl px-1 py-6 sm:py-10 space-y-6">
            <RecipeCard
              recipe={recipe}
              source={recipeSource}
              afterTitle={<LabBanner recipe={recipe} onEnterLab={handleEnterLab} ingredientsLoading={ingredientsLoading} />}
            />
          </main>
        </>
      )}
    </div>
  );
}
