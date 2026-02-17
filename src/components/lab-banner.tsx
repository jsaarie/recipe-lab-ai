"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import type { ParsedRecipe } from "@/types/recipe";

interface LabBannerProps {
  recipe: ParsedRecipe;
  onEnterLab: () => void;
  ingredientsLoading?: boolean;
}

export function LabBanner({ recipe, onEnterLab, ingredientsLoading = false }: LabBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const stepCount = recipe.instructions.length;
  const totalTime = recipe.totalTime;

  return (
    <div
      className={`w-full max-w-2xl transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0"
      }`}
    >
      <div className="rounded-xl border border-[#7C9070]/20 bg-[#7C9070]/5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center gap-2">
          <p className="text-sm text-neutral-500">
            {stepCount} {stepCount === 1 ? "step" : "steps"}
            {totalTime ? ` · ${totalTime} total` : ""}
          </p>
          {ingredientsLoading && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-400">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Mapping ingredients…
            </span>
          )}
        </div>
        <Button
          onClick={onEnterLab}
          disabled={ingredientsLoading}
          className="h-12 w-full rounded-full bg-[#7C9070] text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60] disabled:opacity-60"
        >
          <ChefHat className="size-5" />
          Cook
        </Button>
      </div>
    </div>
  );
}
