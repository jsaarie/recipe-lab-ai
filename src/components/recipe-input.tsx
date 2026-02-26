"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParsedRecipe, StepIngredient } from "@/types/recipe";

interface RecipeInputProps {
  compact?: boolean;
  onRecipeParsed: (recipe: ParsedRecipe, source: "structured" | "ai") => void;
  onLoading: (loading: boolean) => void;
  onStepIngredientsMapped?: (si: StepIngredient[][] | null) => void;
  onError?: (error: string) => void;
}

export function RecipeInput({ compact, onRecipeParsed, onLoading, onStepIngredientsMapped, onError }: RecipeInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setErrorWithCallback(msg: string) {
    setError(msg);
    onError?.(msg);
  }

  function clearError() {
    setError("");
    onError?.("");
  }

  function validateUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();

    const trimmed = url.trim();
    if (!trimmed) {
      setErrorWithCallback("Please enter a recipe URL.");
      return;
    }
    if (!validateUrl(trimmed)) {
      setErrorWithCallback("Please enter a valid URL (e.g. https://example.com/recipe).");
      return;
    }

    setLoading(true);
    onLoading(true);

    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorWithCallback(data.error || "Failed to extract recipe.");
        return;
      }

      // Blocked even after Browserless fallback — prompt the extension as last resort
      if (data.blocked) {
        setErrorWithCallback(
          "This site blocks automated access. Install the Recipe Lab extension and click its icon while on that page."
        );
        return;
      }

      clearError();
      const source = data.source || "ai";
      onRecipeParsed(data.recipe, source);

      // For structured data, kick off step-ingredient mapping in the background.
      // The Cook button stays disabled until this resolves (or fails).
      if (source === "structured" && onStepIngredientsMapped) {
        fetch("/api/map-ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredients: data.recipe.ingredients,
            instructions: data.recipe.instructions,
          }),
        })
          .then((r) => r.json())
          .then((d) => onStepIngredientsMapped(d.stepIngredients ?? null))
          .catch(() => onStepIngredientsMapped(null));
      }
    } catch {
      setErrorWithCallback("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }

  return (
    <div className={`w-full space-y-3 ${compact ? "max-w-xl" : "max-w-xl lg:max-w-none"}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          type="url"
          placeholder="Paste a recipe link..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) clearError();
          }}
          className={`rounded-full border-neutral-200 bg-white text-neutral-700 shadow-sm placeholder:text-neutral-400 focus-visible:ring-[#7C9070]/40 ${compact ? "h-10 pl-4 pr-4 text-sm sm:h-11 sm:pr-20" : "h-14 pl-5 pr-4 text-base sm:h-16 sm:pl-7 sm:pr-32 sm:text-lg"}`}
        />
        <Button
          type="submit"
          disabled={loading}
          className={`absolute top-1/2 -translate-y-1/2 hidden rounded-full bg-[#7C9070] font-semibold text-white shadow-sm hover:bg-[#6B7F60] disabled:opacity-50 sm:inline-flex ${compact ? "right-1.5 h-8 px-4 text-sm" : "right-2 h-12 px-7 text-base"}`}
        >
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
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
          ) : (
            "Cook"
          )}
        </Button>
      </form>

      {error && !compact && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
