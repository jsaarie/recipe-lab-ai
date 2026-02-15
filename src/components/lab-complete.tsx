"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, ChefHat } from "lucide-react";
import type { ParsedRecipe } from "@/types/recipe";

interface LabCompleteProps {
  recipe: ParsedRecipe;
  onViewRecipe: () => void;
  onCookAnother: () => void;
}

export function LabComplete({ recipe, onViewRecipe, onCookAnother }: LabCompleteProps) {
  const stepCount = recipe.instructions.length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#7C9070]">
            You did it!
          </h1>
          <p className="text-lg font-semibold text-neutral-700">
            {recipe.title}
          </p>
          <p className="text-sm text-neutral-500">
            {stepCount} {stepCount === 1 ? "step" : "steps"} completed
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            onClick={onViewRecipe}
            variant="outline"
            className="h-12 w-full rounded-full border-neutral-300 text-base font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <BookOpen className="size-5" />
            View Full Recipe
          </Button>
          <Button
            onClick={onCookAnother}
            className="h-12 w-full rounded-full bg-[#7C9070] text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60]"
          >
            <ChefHat className="size-5" />
            Cook Another
          </Button>
        </div>
      </div>
    </div>
  );
}
