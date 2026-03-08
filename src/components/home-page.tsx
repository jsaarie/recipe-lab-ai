"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { RecipeInput } from "@/components/recipe-input";
import { RecipeCard } from "@/components/recipe-card";
import { LabBanner } from "@/components/lab-banner";
import { LabView } from "@/components/lab-view";
import { LabComplete } from "@/components/lab-complete";
import { FeedbackModal } from "@/components/feedback-modal";
import { UserNav } from "@/components/auth/user-nav";
import { useRecipeEditor, type RecipeEditorOptions, type UnitSystem } from "@/lib/use-recipe-editor";
import type { ParsedRecipe, StepIngredient } from "@/types/recipe";
import { Star } from "lucide-react";

// ---------------------------------------------------------------------------
// Sticky header with scroll-aware shadow
// ---------------------------------------------------------------------------

function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-10 w-full bg-background/95 backdrop-blur-sm transition-shadow duration-200 ${scrolled ? "shadow-sm" : ""}`}
    >
      {/* Thin sage accent line */}
      <div className="h-0.5 bg-gradient-to-r from-sage-300/0 via-primary/40 to-sage-300/0" />
      <div className="px-3 py-3.5 sm:py-4">
        {children}
      </div>
    </header>
  );
}

type View = "recipe" | "lab" | "complete";

// ---------------------------------------------------------------------------
// Loading skeleton — shown while recipe is being extracted
// ---------------------------------------------------------------------------

const loadingMessages = [
  "Fetching page…",
  "Extracting recipe…",
  "Parsing ingredients…",
  "Almost done…",
];

function LoadingSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i < loadingMessages.length - 1 ? i + 1 : i));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full animate-fade-up space-y-5">
      {/* Progress text */}
      <div className="flex items-center justify-center gap-3 text-warm-500">
        <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="transition-opacity duration-300">{loadingMessages[msgIndex]}</span>
      </div>
      {/* Skeleton card preview */}
      <div className="rounded-xl border border-warm-200 bg-white p-6 shadow-sm space-y-4">
        <div className="skeleton-shimmer mx-auto h-6 w-3/4 rounded" />
        <div className="flex justify-center gap-2">
          <div className="skeleton-shimmer h-7 w-16 rounded-full" />
          <div className="skeleton-shimmer h-7 w-20 rounded-full" />
          <div className="skeleton-shimmer h-7 w-16 rounded-full" />
        </div>
        <div className="border-t border-warm-100 pt-4 space-y-2.5">
          <div className="skeleton-shimmer h-4 w-full rounded" />
          <div className="skeleton-shimmer h-4 w-5/6 rounded" />
          <div className="skeleton-shimmer h-4 w-4/6 rounded" />
          <div className="skeleton-shimmer h-4 w-full rounded" />
          <div className="skeleton-shimmer h-4 w-3/4 rounded" />
        </div>
      </div>
    </div>
  );
}

// Inner component that runs the editor hook — only mounted when a recipe exists
function RecipeView({
  recipe,
  recipeSource,
  isOcr,
  editorOptions,
  ingredientsLoading,
  parseError,
  view,
  labStep,
  activeSaved,
  onActiveSavedChange,
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
  isOcr: boolean;
  editorOptions: RecipeEditorOptions;
  ingredientsLoading: boolean;
  parseError: string;
  view: View;
  labStep: number;
  activeSaved: { id: string; rating?: number; cookNotes?: string } | null;
  onActiveSavedChange: (v: { id: string; rating?: number; cookNotes?: string } | null) => void;
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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
        isOcr={isOcr}
        onViewRecipe={onViewRecipe}
        onCookAnother={onCookAnother}
        onBackToLastStep={onBackToLastStep}
      />
    );
  }

  const feedbackPanel = activeSaved ? (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-warm-200 bg-warm-50 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`size-4 ${activeSaved.rating !== undefined && s <= activeSaved.rating ? "fill-amber-400 text-amber-400" : "fill-warm-100 text-warm-300"}`}
            />
          ))}
          {activeSaved.rating === undefined && (
            <span className="ml-1 text-xs text-warm-400">Not rated yet</span>
          )}
        </div>
        {activeSaved.cookNotes && (
          <p className="text-xs text-warm-500 line-clamp-2">{activeSaved.cookNotes}</p>
        )}
      </div>
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        {activeSaved.rating !== undefined || activeSaved.cookNotes ? "Edit" : "Rate"}
      </button>
    </div>
  ) : null;

  return (
    <>
      {showFeedbackModal && activeSaved && (
        <FeedbackModal
          recipeId={activeSaved.id}
          recipeTitle={recipe.title}
          initialRating={activeSaved.rating}
          initialNotes={activeSaved.cookNotes}
          onClose={() => setShowFeedbackModal(false)}
          onSaved={(rating, cookNotes) => {
            onActiveSavedChange({ ...activeSaved, rating, cookNotes });
            setShowFeedbackModal(false);
          }}
        />
      )}
      <StickyHeader>
        <div className="mx-auto flex max-w-2xl items-center gap-2 sm:gap-4">
          <Link href="/" className="shrink-0 font-serif font-bold text-warm-700" aria-label="Recipe Lab AI home">
            {/* Erlenmeyer flask icon on mobile, full logo on sm+ */}
            <svg className="h-8 w-8 sm:hidden" viewBox="0 0 32 32" fill="none">
              {/* Flask body fill — warm gradient */}
              <defs>
                <linearGradient id="flask-fill" x1="16" y1="22" x2="16" y2="12" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#e89548" />
                  <stop offset="100%" stopColor="#f0b060" />
                </linearGradient>
              </defs>
              {/* Liquid inside flask */}
              <path d="M8 26a2.5 2.5 0 01-1.8-3L10 15h12l3.8 8a2.5 2.5 0 01-1.8 3H8z" fill="url(#flask-fill)" opacity="0.85" />
              {/* Flask outline */}
              <path d="M13 4h6v8l5.2 10.5a2 2 0 01-1.8 2.8H9.6a2 2 0 01-1.8-2.8L13 12V4z" stroke="currentColor" className="text-primary" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              {/* Flask rim */}
              <path d="M12 4h8" stroke="currentColor" className="text-primary" strokeWidth="1.6" strokeLinecap="round" />
              {/* Liquid wave line */}
              <path d="M9.5 16c1.5 1 3.5-0.5 6.5 0.5s4-0.5 6 0" stroke="white" strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
              {/* Bubbles rising from top */}
              <circle cx="15" cy="2.5" r="1" fill="currentColor" className="text-primary" opacity="0.5" />
              <circle cx="18.5" cy="1.5" r="0.7" fill="currentColor" className="text-primary" opacity="0.35" />
              <circle cx="13" cy="1" r="0.5" fill="currentColor" className="text-primary" opacity="0.25" />
            </svg>
            <span className="hidden text-lg sm:inline">Recipe Lab <span className="text-primary">AI</span></span>
          </Link>
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
      </StickyHeader>
      {parseError && (
        <div className="w-full max-w-2xl mx-auto px-4 pt-4">
          <p className="text-center text-sm text-red-500">{parseError}</p>
        </div>
      )}
      <main className="w-full max-w-2xl px-2 py-6 sm:px-4 sm:py-10 space-y-6">
        <RecipeCard
          recipe={recipe}
          source={recipeSource}
          afterTitle={
            <>
              <LabBanner
                onEnterLab={onEnterLab}
                ingredientsLoading={ingredientsLoading}
              />
              {feedbackPanel}
            </>
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
  const [isOcr, setIsOcr] = useState(false);
  const [editorOptions, setEditorOptions] = useState<RecipeEditorOptions>({});
  const [loading, setLoading] = useState(false);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [parseError, setParseError] = useState("");
  const [view, setView] = useState<View>("recipe");
  const [labStep, setLabStep] = useState(0);

  // Feedback for a saved recipe currently being viewed
  const [activeSaved, setActiveSaved] = useState<{
    id: string;
    rating?: number;
    cookNotes?: string;
  } | null>(null);

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

  // Load digitized recipe from sessionStorage when ?digitized=1
  useEffect(() => {
    if (!searchParams.get("digitized")) return;
    const raw = sessionStorage.getItem("digitizedRecipe");
    if (!raw) return;
    sessionStorage.removeItem("digitizedRecipe");
    try {
      const recipe = JSON.parse(raw);
      setRecipe(recipe);
      setRecipeSource("structured");
      setIsOcr(true);
      setEditorOptions({});
      setView("recipe");
      setLabStep(0);
    } catch {
      setParseError("Could not load digitized recipe");
    }
  }, [searchParams]);

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
        setActiveSaved({
          id: data._id,
          rating: data.rating,
          cookNotes: data.cookNotes,
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
    setIsOcr(false);
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
    setActiveSaved(null);
    setRecipe(null);
    setEditorOptions({});
    setView("recipe");
    setLabStep(0);
  }, []);

  if (hasRecipe) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-background px-4">
        <RecipeView
          recipe={recipe}
          recipeSource={recipeSource}
          isOcr={isOcr}
          editorOptions={editorOptions}
          ingredientsLoading={ingredientsLoading}
          parseError={parseError}
          view={view}
          labStep={labStep}
          activeSaved={activeSaved}
          onActiveSavedChange={setActiveSaved}
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
    <div className="hero-bg flex min-h-screen flex-col items-center bg-background px-4">
      {/* Hero state */}
      {!loading && (
        <>
          <header className="relative z-10 w-full max-w-xl py-4 flex justify-end">
            <UserNav />
          </header>
          <div className="grain-overlay relative flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 -mt-14">
          {/* Decorative herb SVG */}
          <svg className="absolute -top-8 right-0 h-32 w-32 text-sage-200 opacity-50 sm:h-48 sm:w-48" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path d="M60 110 C60 70 30 60 15 30 C35 50 55 45 60 20 C65 45 85 50 105 30 C90 60 60 70 60 110Z" fill="currentColor" opacity="0.3"/>
            <path d="M60 110 C60 80 45 70 30 50" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
            <path d="M60 110 C60 80 75 70 90 50" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
            <path d="M60 110 C60 75 60 60 60 20" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
          </svg>
          <svg className="absolute -bottom-4 left-0 h-24 w-24 text-sage-200 opacity-40 sm:h-36 sm:w-36" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M50 90 C50 60 25 50 10 25 C30 40 45 38 50 15 C55 38 70 40 90 25 C75 50 50 60 50 90Z" fill="currentColor" opacity="0.25"/>
          </svg>

          <div className="relative z-[1] flex flex-col items-center gap-3 text-center animate-fade-up">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-warm-700 sm:text-5xl md:text-6xl">
              Recipe Lab <span className="text-primary">AI</span>
            </h1>
            <p className="max-w-sm text-lg text-warm-500 sm:text-xl animate-fade-up-delay-1">
              Stop Scrolling. Start Cooking.
            </p>
          </div>
          <div className="relative z-[1] w-full space-y-3 animate-fade-up-delay-2">
            <RecipeInput
              onRecipeParsed={handleRecipeParsed}
              onLoading={setLoading}
              onStepIngredientsMapped={handleStepIngredientsMapped}
              onError={setParseError}
            />
            {parseError ? (
              <p className="text-center text-sm text-red-500">{parseError}</p>
            ) : (
              <p className="text-center text-sm text-warm-500">
                Paste any recipe URL to remove the clutter and get straight to the kitchen.
              </p>
            )}
          </div>

          {/* How it works — below the fold */}
          <div className="relative z-[1] mt-8 w-full animate-fade-up-delay-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 sm:h-12 sm:w-12">
                  <svg className="h-5 w-5 text-primary sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-warm-600 sm:text-sm">Paste a link</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 sm:h-12 sm:w-12">
                  <svg className="h-5 w-5 text-primary sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                    <path d="M12 2a4 4 0 00-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-warm-600 sm:text-sm">AI extracts</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 sm:h-12 sm:w-12">
                  <svg className="h-5 w-5 text-primary sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 13.87A4 4 0 017.41 6a5.11 5.11 0 011.05-1.54 5 5 0 017.08 0A5.11 5.11 0 0116.59 6 4 4 0 0118 13.87V21H6z" />
                    <line x1="6" y1="17" x2="18" y2="17" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-warm-600 sm:text-sm">Start cooking</p>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Loading state — skeleton preview */}
      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 w-full max-w-xl">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-warm-700 animate-fade-up">
            Recipe Lab <span className="text-primary">AI</span>
          </h1>
          <LoadingSkeleton />
        </div>
      )}
    </div>
  );
}
