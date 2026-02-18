"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronLeft } from "lucide-react";
import type { ParsedRecipe } from "@/types/recipe";

interface LabCompleteProps {
  recipe: ParsedRecipe;
  onViewRecipe: () => void;
  onCookAnother: () => void;
  onBackToLastStep: () => void;
}

export function LabComplete({ recipe, onViewRecipe, onBackToLastStep }: LabCompleteProps) {
  const stepCount = recipe.instructions.length;

  // Slide-in on mount
  const [slideClass, setSlideClass] = useState("translate-x-8 opacity-0");
  const [showArrow, setShowArrow] = useState(true);
  const arrowTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const t = setTimeout(() => setSlideClass("translate-x-0 opacity-100"), 16);
    return () => clearTimeout(t);
  }, []);

  // Fade arrow after 3s
  useEffect(() => {
    arrowTimer.current = setTimeout(() => setShowArrow(false), 3000);
    return () => {
      if (arrowTimer.current) clearTimeout(arrowTimer.current);
    };
  }, []);

  const goBack = useCallback(() => {
    setSlideClass("translate-x-8 opacity-0");
    setTimeout(onBackToLastStep, 200);
  }, [onBackToLastStep]);

  // Swipe support
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX > 0) {
        if (navigator.vibrate) navigator.vibrate(10);
        goBack();
      }
    },
    [goBack]
  );

  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (window.innerWidth >= 640) return;
      const ratio = e.clientX / window.innerWidth;
      if (ratio <= 0.4) goBack();
    },
    [goBack]
  );

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4"
      onClick={handleTapZone}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Left edge arrow hint (mobile only) */}
      <div
        className={`fixed left-3 top-1/2 -translate-y-1/2 z-20 sm:hidden transition-opacity duration-500 ${
          showArrow ? "opacity-40" : "opacity-0"
        }`}
      >
        <ChevronLeft className="size-8 text-neutral-400" />
      </div>

      <div
        className={`w-full max-w-sm text-center space-y-6 transition-all duration-200 ease-out ${slideClass}`}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#7C9070]">
            Enjoy!
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
            onClick={(e) => { e.stopPropagation(); onViewRecipe(); }}
            className="h-12 w-full rounded-full bg-[#7C9070] text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60]"
          >
            <BookOpen className="size-5" />
            View Full Recipe
          </Button>
          <Button
            onClick={(e) => { e.stopPropagation(); goBack(); }}
            variant="outline"
            className="hidden sm:flex h-12 w-full rounded-full text-base font-semibold text-neutral-600"
          >
            <ChevronLeft className="size-5" />
            Back to Last Step
          </Button>
        </div>
      </div>
    </div>
  );
}
