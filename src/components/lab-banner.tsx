"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import type { ParsedRecipe } from "@/types/recipe";

interface LabBannerProps {
  recipe: ParsedRecipe;
  onEnterLab: () => void;
}

export function LabBanner({ recipe, onEnterLab }: LabBannerProps) {
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
        <p className="mb-4 text-sm text-neutral-500">
          {stepCount} {stepCount === 1 ? "step" : "steps"}
          {totalTime ? ` · ${totalTime} total` : ""}
        </p>
        <Button
          onClick={onEnterLab}
          className="h-12 w-full rounded-full bg-[#7C9070] text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60]"
        >
          <ChefHat className="size-5" />
          Cook
        </Button>
      </div>
    </div>
  );
}
