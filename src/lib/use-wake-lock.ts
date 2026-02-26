"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const [isSupported] = useState(() => "wakeLock" in navigator);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);

      wakeLockRef.current.addEventListener("release", () => {
        setIsActive(false);
        wakeLockRef.current = null;
      });
    } catch {
      // Wake lock request can fail (e.g. low battery, background tab)
      setIsActive(false);
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isActive) {
      await release();
    } else {
      await request();
    }
  }, [isActive, request, release]);

  // Re-acquire wake lock when tab becomes visible again (browser releases it on hide)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isActive && !wakeLockRef.current) {
        request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive, request]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  return { isActive, isSupported, toggle, request, release };
}
