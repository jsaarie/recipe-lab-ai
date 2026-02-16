"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface TimerToastProps {
  message: string;
  onDismiss: () => void;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch {
    // Audio not available
  }
}

export function TimerToast({ message, onDismiss }: TimerToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));

    // Play chime + vibrate
    playChime();
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Auto-dismiss after 5s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-2 rounded-full bg-[#7C9070] px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <Timer className="size-4" />
        {message}
      </button>
    </div>
  );
}
