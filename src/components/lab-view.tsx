"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { ParsedRecipe } from "@/types/recipe";

interface LabViewProps {
  recipe: ParsedRecipe;
  initialStep?: number;
  onExitLab: () => void;
  onComplete: () => void;
}

function ProgressBar({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  const percent = total <= 1 ? 100 : ((current) / (total - 1)) * 100;

  return (
    <div className="px-4 py-3">
      <div className="h-1.5 w-full rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-[#7C9070] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
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

      // Only trigger if horizontal movement > 50px and greater than vertical
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      if (deltaX < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    [onSwipeLeft, onSwipeRight]
  );

  return { onTouchStart, onTouchEnd };
}

export function LabView({ recipe, initialStep = 0, onExitLab, onComplete }: LabViewProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [slideDirection, setSlideDirection] = useState<"out-left" | "out-right" | "in-right" | "in-left" | null>(null);
  const [showArrows, setShowArrows] = useState(true);
  const arrowTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const steps = recipe.instructions;
  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Fade arrows after 3 seconds, reset on step change
  const resetArrowTimer = useCallback(() => {
    setShowArrows(true);
    if (arrowTimer.current) clearTimeout(arrowTimer.current);
    arrowTimer.current = setTimeout(() => setShowArrows(false), 3000);
  }, []);

  useEffect(() => {
    resetArrowTimer();
    return () => {
      if (arrowTimer.current) clearTimeout(arrowTimer.current);
    };
  }, [currentStep, resetArrowTimer]);

  const advanceStep = useCallback(() => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setSlideDirection("out-left");
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setSlideDirection("in-right");
      setTimeout(() => setSlideDirection(null), 300);
    }, 200);
  }, [isLastStep, onComplete]);

  const goBackStep = useCallback(() => {
    if (isFirstStep) return;

    setSlideDirection("out-right");
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      setSlideDirection("in-left");
      setTimeout(() => setSlideDirection(null), 300);
    }, 200);
  }, [isFirstStep]);

  const swipe = useSwipe(advanceStep, goBackStep);

  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only on mobile (sm breakpoint = 640px)
      if (window.innerWidth >= 640) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const ratio = x / width;

      if (ratio <= 0.4 && !isFirstStep) {
        goBackStep();
      } else if (ratio >= 0.6) {
        advanceStep();
      }
      // Center 20% is dead zone — no action
    },
    [advanceStep, goBackStep, isFirstStep]
  );

  const getSlideClass = () => {
    switch (slideDirection) {
      case "out-left":
        return "-translate-x-8 opacity-0";
      case "out-right":
        return "translate-x-8 opacity-0";
      case "in-right":
        return "translate-x-8 opacity-0";
      case "in-left":
        return "-translate-x-8 opacity-0";
      default:
        return "translate-x-0 opacity-100";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
      {/* Lab Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-[#FAF8F5]/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center">
          <button
            onClick={onExitLab}
            className="flex items-center text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="Exit Lab"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="flex-1 truncate text-center text-sm font-semibold text-neutral-700 px-4">
            {recipe.title}
          </h1>
          <div className="w-5" />
        </div>
      </header>

      {/* Main Content Area — swipe + tap zones */}
      <div
        className="relative flex flex-1 flex-col items-center px-4 sm:pb-8"
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
        onClick={handleTapZone}
      >
        {/* Edge Arrow Hints (mobile only) */}
        {!isFirstStep && (
          <div
            className={`fixed left-3 top-1/2 -translate-y-1/2 z-20 sm:hidden transition-opacity duration-500 ${
              showArrows ? "opacity-40" : "opacity-0"
            }`}
          >
            <ChevronLeft className="size-8 text-neutral-400" />
          </div>
        )}
        {!isLastStep && (
          <div
            className={`fixed right-3 top-1/2 -translate-y-1/2 z-20 sm:hidden transition-opacity duration-500 ${
              showArrows ? "opacity-40" : "opacity-0"
            }`}
          >
            <ChevronRight className="size-8 text-neutral-400" />
          </div>
        )}

        <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col pt-6 sm:pt-10">
          {/* Active Step Instruction */}
          <div
            className={`transition-all duration-200 ease-out ${getSlideClass()}`}
          >
            <p className="text-left text-lg leading-relaxed text-neutral-800 sm:text-xl sm:leading-relaxed">
              {steps[currentStep]}
            </p>
          </div>

          {/* Progress Bar + Step Label */}
          <div className="mt-3 w-full max-w-xs">
            <p className="px-4 mb-1 text-right text-[10px] font-medium tracking-wide text-neutral-400">
              Step {currentStep + 1} of {totalSteps}
            </p>
            <ProgressBar total={totalSteps} current={currentStep} />
          </div>

          {/* On Deck */}
          {!isLastStep && (
            <>
              <hr className="my-6 border-neutral-200 sm:my-8" />
              <div className="rounded-lg bg-neutral-50 px-4 py-4 sm:px-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  On Deck — Step {currentStep + 2}
                </p>
                <p className="text-sm leading-relaxed text-neutral-400">
                  {steps[currentStep + 1]}
                </p>
              </div>
            </>
          )}

          {/* Inline action button for desktop only */}
          <div className="mt-8 hidden sm:block">
            <Button
              onClick={advanceStep}
              className="h-12 w-full rounded-full bg-[#7C9070] text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60]"
            >
              {isLastStep ? "Finish Recipe" : "Done — Next Step"}
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
