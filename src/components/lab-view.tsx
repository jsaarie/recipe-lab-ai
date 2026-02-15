"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { ParsedRecipe } from "@/types/recipe";

interface LabViewProps {
  recipe: ParsedRecipe;
  initialStep?: number;
  onExitLab: () => void;
  onComplete: () => void;
}

function ProgressDots({
  total,
  current,
  onJump,
}: {
  total: number;
  current: number;
  onJump: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto">
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < current;
        const isCurrent = i === current;

        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={`shrink-0 rounded-full transition-all duration-300 ${
              isCurrent
                ? "h-4 w-4 scale-125 bg-[#7C9070]/20 ring-2 ring-[#7C9070]"
                : isCompleted
                  ? "h-3 w-3 bg-[#7C9070]"
                  : "h-3 w-3 border-2 border-neutral-300 bg-transparent"
            }`}
            aria-label={`Step ${i + 1}${isCurrent ? " (current)" : isCompleted ? " (completed)" : ""}`}
          />
        );
      })}
    </div>
  );
}

export function LabView({ recipe, initialStep = 0, onExitLab, onComplete }: LabViewProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [slideDirection, setSlideDirection] = useState<"in" | "out-left" | "in-right" | null>(null);

  const steps = recipe.instructions;
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

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

  const jumpToStep = useCallback((step: number) => {
    if (step === currentStep) return;
    const direction = step > currentStep ? "out-left" : "in-right";
    setSlideDirection(direction);
    setTimeout(() => {
      setCurrentStep(step);
      setSlideDirection(direction === "out-left" ? "in-right" : "out-left");
      setTimeout(() => setSlideDirection(null), 300);
    }, 200);
  }, [currentStep]);

  const getSlideClass = () => {
    switch (slideDirection) {
      case "out-left":
        return "-translate-x-8 opacity-0";
      case "in-right":
        return "translate-x-8 opacity-0";
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
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Exit Lab
          </button>
          <h1 className="flex-1 truncate text-center text-sm font-semibold text-neutral-700 px-4">
            {recipe.title}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Progress Dots */}
      <div className="border-b border-neutral-100">
        <div className="mx-auto max-w-2xl">
          <ProgressDots total={totalSteps} current={currentStep} onJump={jumpToStep} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col items-center px-4 pb-24 sm:pb-8">
        <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col justify-center py-8 sm:py-12">
          {/* Step Label */}
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Step {currentStep + 1} of {totalSteps}
          </p>

          {/* Active Step Instruction */}
          <div
            className={`transition-all duration-200 ease-out ${getSlideClass()}`}
          >
            <p className="text-center text-lg leading-relaxed text-neutral-800 sm:text-xl sm:leading-relaxed">
              {steps[currentStep]}
            </p>
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

          {/* Inline action button for desktop */}
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

      {/* Fixed bottom action bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-[#FAF8F5]/95 p-4 backdrop-blur-sm sm:hidden">
        <Button
          onClick={advanceStep}
          className="h-14 w-full rounded-full bg-[#7C9070] text-base font-semibold text-white shadow-sm hover:bg-[#6B7F60]"
        >
          {isLastStep ? "Finish Recipe" : "Done — Next Step"}
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
