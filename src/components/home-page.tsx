"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { RecipeInput } from "@/components/recipe-input";
import { RecipeCard } from "@/components/recipe-card";
import { LabBanner } from "@/components/lab-banner";
import { LabView } from "@/components/lab-view";
import { LabComplete } from "@/components/lab-complete";
import { UserNav } from "@/components/auth/user-nav";
import { useRecipeEditor, type RecipeEditorOptions, type UnitSystem } from "@/lib/use-recipe-editor";
import type { ParsedRecipe, StepIngredient } from "@/types/recipe";

type View = "recipe" | "lab" | "complete";

// Inner component that runs the editor hook — only mounted when a recipe exists
function RecipeView({
  recipe,
  recipeSource,
  editorOptions,
  ingredientsLoading,
  parseError,
  view,
  labStep,
  onRecipeParsed,
  onStepIngredientsMapped,
  onError,
  onLoading,
  onEnterLab,
  onExitLab,
  onLabComplete,
  onViewRecipe,
  onBackToLastStep,
  onCookAnother,
}: {
  recipe: ParsedRecipe;
  recipeSource: "structured" | "ai";
  editorOptions: RecipeEditorOptions;
  ingredientsLoading: boolean;
  parseError: string;
  view: View;
  labStep: number;
  onRecipeParsed: (r: ParsedRecipe, s: "structured" | "ai") => void;
  onStepIngredientsMapped: (si: StepIngredient[][] | null) => void;
  onError: (e: string) => void;
  onLoading: (l: boolean) => void;
  onEnterLab: () => void;
  onExitLab: () => void;
  onLabComplete: () => void;
  onViewRecipe: () => void;
  onBackToLastStep: () => void;
  onCookAnother: () => void;
}) {
  const editor = useRecipeEditor(recipe, editorOptions);

  if (view === "lab") {
    return (
      <LabView
        recipe={recipe}
        derivedInstructions={editor.derivedInstructions}
        initialStep={labStep}
        onExitLab={onExitLab}
        onComplete={onLabComplete}
      />
    );
  }

  if (view === "complete") {
    const ingredientSwaps: Record<number, string> = {};
    editor.ingredientOverrides.forEach((override, index) => {
      if (override.wasSwapped && override.item) ingredientSwaps[index] = override.item;
    });
    return (
      <LabComplete
        recipe={recipe}
        servings={editor.servings}
        ingredientSwaps={ingredientSwaps}
        unitSystem={editor.unitSystem}
        onViewRecipe={onViewRecipe}
        onCookAnother={onCookAnother}
        onBackToLastStep={onBackToLastStep}
      />
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-[#FAF8F5]/95 px-3 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:gap-4">
          <span className="shrink-0 text-lg font-bold text-neutral-700">
            Recipe Lab <span className="text-[#7C9070]">AI</span>
          </span>
          <div className="flex-1">
            <RecipeInput
              compact
              onRecipeParsed={onRecipeParsed}
              onLoading={onLoading}
              onStepIngredientsMapped={onStepIngredientsMapped}
              onError={onError}
            />
          </div>
          <UserNav />
        </div>
      </header>
      {parseError && (
        <div className="w-full max-w-2xl mx-auto px-4 pt-4">
          <p className="text-center text-sm text-red-500">{parseError}</p>
        </div>
      )}
      <main className="w-full max-w-2xl px-1 py-6 sm:py-10 space-y-6">
        <RecipeCard
          recipe={recipe}
          source={recipeSource}
          afterTitle={
            <LabBanner
              recipe={recipe}
              onEnterLab={onEnterLab}
              ingredientsLoading={ingredientsLoading}
            />
          }
          editor={{
            derivedIngredients: editor.derivedIngredients,
            derivedInstructions: editor.derivedInstructions,
            servings: editor.servings,
            originalServings: editor.originalServings,
            unitSystem: editor.unitSystem,
            ingredientOverrides: editor.ingredientOverrides,
            onServingsChange: editor.setServings,
            onIngredientQuantityChange: editor.setIngredientQuantity,
            onIngredientItemChange: editor.setIngredientItem,
            onClearIngredientSwap: editor.clearIngredientSwap,
            onUnitSystemChange: editor.setUnitSystem,
            onResetAll: editor.resetAll,
          }}
        />
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Top-level HomePage — manages recipe fetch state and view routing
// ---------------------------------------------------------------------------

export function HomePage() {
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [recipeSource, setRecipeSource] = useState<"structured" | "ai">("structured");
  const [editorOptions, setEditorOptions] = useState<RecipeEditorOptions>({});
  const [loading, setLoading] = useState(false);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [view, setView] = useState<View>("recipe");
  const [labStep, setLabStep] = useState(0);

  const hasRecipe = recipe !== null;

  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Fetch user profile unit preference when logged in, apply as editor default
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const unitSystem = data?.user?.defaultUnitSystem as UnitSystem | undefined;
        if (unitSystem) {
          setEditorOptions((prev) => ({ ...prev, initialUnitSystem: unitSystem }));
        }
      })
      .catch(() => {/* silently ignore */});
  }, [session?.user]);

  // Load saved recipe from ?saved=ID query param
  useEffect(() => {
    const savedId = searchParams.get("saved");
    if (!savedId) return;
    fetch(`/api/library/${savedId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setRecipe(data.recipe);
        setRecipeSource("structured");
        setEditorOptions({
          initialServings: data.servings,
          initialUnitSystem: data.unitSystem,
          initialIngredientSwaps: data.ingredientSwaps,
        });
        setView("recipe");
        setLabStep(0);
      })
      .catch(() => {
        setParseError("Could not load saved recipe");
      });
  }, [searchParams]);

  const handleRecipeParsed = useCallback((r: ParsedRecipe, s: "structured" | "ai") => {
    setRecipe(r);
    setRecipeSource(s);
    setEditorOptions({});
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

  const handleEnterLab = useCallback(() => setView("lab"), []);
  const handleExitLab = useCallback(() => setView("recipe"), []);
  const handleLabComplete = useCallback(() => {
    setLabStep(recipe ? recipe.instructions.length - 1 : 0);
    setView("complete");
  }, [recipe]);
  const handleViewRecipe = useCallback(() => setView("recipe"), []);
  const handleBackToLastStep = useCallback(() => setView("lab"), []);
  const handleCookAnother = useCallback(() => {
    setRecipe(null);
    setEditorOptions({});
    setView("recipe");
    setLabStep(0);
  }, []);

  if (hasRecipe) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-[#FAF8F5] px-4">
        <RecipeView
          recipe={recipe}
          recipeSource={recipeSource}
          editorOptions={editorOptions}
          ingredientsLoading={ingredientsLoading}
          parseError={parseError}
          view={view}
          labStep={labStep}
          onRecipeParsed={handleRecipeParsed}
          onStepIngredientsMapped={handleStepIngredientsMapped}
          onError={setParseError}
          onLoading={setLoading}
          onEnterLab={handleEnterLab}
          onExitLab={handleExitLab}
          onLabComplete={handleLabComplete}
          onViewRecipe={handleViewRecipe}
          onBackToLastStep={handleBackToLastStep}
          onCookAnother={handleCookAnother}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FAF8F5] px-4">
      {/* Hero state */}
      {!loading && (
        <>
          <header className="w-full max-w-xl py-4 flex justify-end">
            <UserNav />
          </header>
          <div className="flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 -mt-14">
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
              onError={setParseError}
            />
            {parseError ? (
              <p className="text-center text-sm text-red-500">{parseError}</p>
            ) : (
              <p className="text-center text-sm text-neutral-400">
                Paste any recipe URL to remove the clutter and get straight to the kitchen.
              </p>
            )}
          </div>
        </div>
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-700">
            Recipe Lab <span className="text-[#7C9070]">AI</span>
          </h1>
          <div className="flex items-center gap-3 text-neutral-500">
            <svg className="h-5 w-5 animate-spin text-[#7C9070]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Extracting recipe...
          </div>
        </div>
      )}
    </div>
  );
}
