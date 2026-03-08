"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";

interface LabBannerProps {
  onEnterLab: () => void;
  ingredientsLoading?: boolean;
}

export function LabBanner({ onEnterLab, ingredientsLoading = false }: LabBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);


  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <Button
        onClick={onEnterLab}
        disabled={ingredientsLoading}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-primary/20 transition-all hover:bg-primary hover:text-white hover:ring-primary active:scale-[0.98] disabled:opacity-60 sm:text-base"
      >
        {ingredientsLoading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <ChefHat className="size-4 sm:size-5" />
        )}
        {ingredientsLoading ? "Preparing…" : "Cook"}
      </Button>
    </div>
  );
}
