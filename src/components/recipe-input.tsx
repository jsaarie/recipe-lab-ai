"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ParsedRecipe } from "@/types/recipe";

// Mock data for testing — will be replaced with real API call
const MOCK_RECIPE: ParsedRecipe = {
  title: "Classic Chocolate Chip Cookies",
  source: "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/",
  prepTime: "15 min",
  cookTime: "12 min",
  totalTime: "27 min",
  servings: "24 cookies",
  ingredients: [
    { quantity: "2 1/4", unit: "cups", item: "all-purpose flour" },
    { quantity: "1", unit: "tsp", item: "baking soda" },
    { quantity: "1", unit: "tsp", item: "salt" },
    { quantity: "1", unit: "cup", item: "butter, softened" },
    { quantity: "3/4", unit: "cup", item: "granulated sugar" },
    { quantity: "3/4", unit: "cup", item: "packed brown sugar" },
    { quantity: "2", unit: "large", item: "eggs" },
    { quantity: "1", unit: "tsp", item: "vanilla extract" },
    { quantity: "2", unit: "cups", item: "chocolate chips" },
  ],
  instructions: [
    "Preheat oven to 375°F (190°C).",
    "Combine flour, baking soda, and salt in a small bowl.",
    "Beat butter, granulated sugar, brown sugar, and vanilla extract in a large mixer bowl until creamy.",
    "Add eggs one at a time, beating well after each addition.",
    "Gradually beat in flour mixture. Stir in chocolate chips.",
    "Drop rounded tablespoon of dough onto ungreased baking sheets.",
    "Bake for 9 to 11 minutes or until golden brown.",
    "Cool on baking sheets for 2 minutes, then remove to wire racks to cool completely.",
  ],
  notes: "Store in an airtight container at room temperature for up to 5 days. Dough can be frozen for up to 2 months.",
};

interface RecipeInputProps {
  compact?: boolean;
  onRecipeParsed: (recipe: ParsedRecipe) => void;
  onLoading: (loading: boolean) => void;
}

export function RecipeInput({ compact, onRecipeParsed, onLoading }: RecipeInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a recipe URL.");
      return;
    }
    if (!validateUrl(trimmed)) {
      setError("Please enter a valid URL (e.g. https://example.com/recipe).");
      return;
    }

    setLoading(true);
    onLoading(true);

    // TODO: Replace with real API call to /api/parse-recipe
    setTimeout(() => {
      setLoading(false);
      onLoading(false);
      onRecipeParsed(MOCK_RECIPE);
    }, 1500);
  }

  return (
    <div className={`w-full space-y-3 ${compact ? "max-w-xl" : "max-w-2xl"}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="url"
            placeholder="Paste a recipe URL..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
            className={`rounded-full border-neutral-200 bg-white px-4 text-neutral-700 shadow-sm placeholder:text-neutral-400 focus-visible:ring-[#7C9070]/40 ${compact ? "h-10 text-sm sm:h-11" : "h-12 text-base sm:h-14 sm:px-6"}`}
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className={`rounded-full disabled:opacity-50 ${compact ? "hidden sm:inline-flex h-11 px-4 text-sm border border-[#7C9070]/30 bg-transparent text-[#7C9070] hover:bg-[#7C9070]/10 font-medium" : "h-12 px-5 text-sm sm:h-14 sm:px-8 sm:text-base bg-[#7C9070] font-semibold text-white shadow-sm hover:bg-[#6B7F60]"}`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
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
              {compact ? "..." : "Extracting..."}
            </span>
          ) : (
            compact ? "Extract" : "Extract Recipe"
          )}
        </Button>
      </form>

      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
