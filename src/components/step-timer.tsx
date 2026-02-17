"use client";

import { Timer, Check, Pause, Play } from "lucide-react";
import { formatTime, type DetectedTimer } from "@/lib/timer-utils";

export interface TimerState {
  status: "idle" | "running" | "paused" | "finished";
  remaining: number;
  total: number;
}

interface StepTimerProps {
  detected: DetectedTimer;
  timerState: TimerState | undefined;
  onStart: () => void;
  onTogglePause: () => void;
}

const CIRCLE_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircleProgress({
  percent,
  status,
}: {
  percent: number;
  status: "idle" | "running" | "paused" | "finished";
}) {
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;

  const trackColor =
    status === "finished" ? "stroke-[#7C9070]/20" : "stroke-neutral-200";
  const progressColor =
    status === "finished" ? "stroke-[#7C9070]" : "stroke-[#7C9070]";

  return (
    <svg
      width={CIRCLE_SIZE}
      height={CIRCLE_SIZE}
      className="block"
    >
      {/* Background track */}
      <circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        fill="none"
        className={trackColor}
        strokeWidth={STROKE_WIDTH}
      />
      {/* Progress arc */}
      <circle
        cx={CIRCLE_SIZE / 2}
        cy={CIRCLE_SIZE / 2}
        r={RADIUS}
        fill="none"
        className={progressColor}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease-out" }}
      />
    </svg>
  );
}

export function StepTimer({ detected, timerState, onStart, onTogglePause }: StepTimerProps) {
  const status = timerState?.status ?? "idle";
  const remaining = timerState?.remaining ?? detected.durationSeconds;
  const total = timerState?.total ?? detected.durationSeconds;
  const percent = status === "idle" ? 100 : status === "finished" ? 100 : (remaining / total) * 100;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === "idle") {
      onStart();
    } else if (status === "running" || status === "paused") {
      onTogglePause();
    }
  };

  // Whole widget is one tap target — circle + label together
  const isActionable = status === "idle" || status === "running" || status === "paused";

  return (
    <div className="mt-5 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleClick}
        disabled={!isActionable}
        className="flex flex-col items-center gap-3 rounded-2xl p-3 -m-3 transition-colors hover:bg-neutral-100 active:bg-neutral-200 disabled:pointer-events-none"
      >
        {/* Circle with centered text */}
        <div className="relative">
          <CircleProgress percent={percent} status={status} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {status === "finished" ? (
              <>
                <Check className="size-6 text-[#7C9070]" />
                <span className="text-xs font-medium text-[#7C9070]">Done!</span>
              </>
            ) : (
              <>
                <span className="text-xl font-semibold tabular-nums text-neutral-800">
                  {formatTime(remaining)}
                </span>
                {status === "paused" && (
                  <span className="text-[10px] font-medium text-neutral-400">Paused</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Label below circle */}
        {status === "idle" && (
          <div className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-500">
            <Timer className="size-4" />
            Start Timer
          </div>
        )}
        {status === "running" && (
          <div className="flex items-center gap-1.5 rounded-full bg-[#7C9070] px-4 py-2 text-sm font-medium text-white shadow-sm">
            <Pause className="size-3.5" />
            Pause
          </div>
        )}
        {status === "paused" && (
          <div className="flex items-center gap-1.5 rounded-full border border-[#7C9070]/30 bg-[#7C9070]/5 px-4 py-2 text-sm font-medium text-[#7C9070]">
            <Play className="size-3.5" />
            Resume
          </div>
        )}
      </button>
    </div>
  );
}
