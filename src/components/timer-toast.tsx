"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Timer } from "lucide-react";

interface TimerToastProps {
  message: string;
  onDismiss: () => void;
}

function createAlarmLoop(ctx: AudioContext): { stop: () => void } {
  let stopped = false;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);

  // Play a two-tone chime, then schedule the next one
  function playChime(when: number) {
    if (stopped) return;

    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(masterGain);
    osc1.frequency.value = 880;
    osc1.type = "sine";
    g1.gain.setValueAtTime(1, when);
    g1.gain.exponentialRampToValueAtTime(0.01, when + 0.4);
    osc1.start(when);
    osc1.stop(when + 0.4);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2);
    g2.connect(masterGain);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    g2.gain.setValueAtTime(1, when + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.01, when + 0.55);
    osc2.start(when + 0.15);
    osc2.stop(when + 0.55);

    // Third higher tone for urgency
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.connect(g3);
    g3.connect(masterGain);
    osc3.frequency.value = 1320;
    osc3.type = "sine";
    g3.gain.setValueAtTime(1, when + 0.3);
    g3.gain.exponentialRampToValueAtTime(0.01, when + 0.7);
    osc3.start(when + 0.3);
    osc3.stop(when + 0.7);
  }

  // Play immediately, then repeat every 2 seconds
  playChime(ctx.currentTime);
  const interval = setInterval(() => {
    if (stopped) return;
    playChime(ctx.currentTime);
  }, 2000);

  return {
    stop: () => {
      stopped = true;
      clearInterval(interval);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    },
  };
}

function startVibrationLoop(): { stop: () => void } {
  if (!navigator.vibrate) return { stop: () => {} };

  navigator.vibrate([200, 100, 200, 100, 200]);
  const interval = setInterval(() => {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }, 2000);

  return {
    stop: () => {
      clearInterval(interval);
      navigator.vibrate(0);
    },
  };
}

export function TimerToast({ message, onDismiss }: TimerToastProps) {
  const [visible, setVisible] = useState(false);
  const alarmRef = useRef<{ stop: () => void } | null>(null);
  const vibrationRef = useRef<{ stop: () => void } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const stopAlarm = useCallback(() => {
    alarmRef.current?.stop();
    alarmRef.current = null;
    vibrationRef.current?.stop();
    vibrationRef.current = null;
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));

    // Start looping alarm + vibration
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      alarmRef.current = createAlarmLoop(ctx);
    } catch {
      // Audio not available
    }
    vibrationRef.current = startVibrationLoop();

    return () => stopAlarm();
  }, [stopAlarm]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopAlarm();
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
        className="flex animate-pulse items-center gap-2 rounded-full bg-[#7C9070] px-5 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <Timer className="size-4" />
        {message}
        <span className="text-xs font-normal opacity-80">Tap to dismiss</span>
      </button>
    </div>
  );
}
