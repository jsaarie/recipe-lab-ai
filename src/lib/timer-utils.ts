export interface DetectedTimer {
  durationSeconds: number;
  label: string;
}

function toSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

function buildLabel(hours: number, minutes: number, seconds: number): string {
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 && hours === 0 && minutes === 0) parts.push(`${seconds} sec`);
  return parts.join(" ") || "0 sec";
}

/**
 * Detects a time duration from recipe instruction text.
 * Returns the first match found, or null if no duration is detected.
 */
export function detectTimer(instruction: string): DetectedTimer | null {
  const text = instruction.toLowerCase();

  // Compound: "1 hour and 30 minutes", "2 hours 15 min"
  const compound = text.match(
    /(\d+)\s*(?:hours?|hrs?)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?)/
  );
  if (compound) {
    const h = parseInt(compound[1], 10);
    const m = parseInt(compound[2], 10);
    return { durationSeconds: toSeconds(h, m, 0), label: buildLabel(h, m, 0) };
  }

  // Range: "10-12 minutes" (use higher bound)
  const range = text.match(
    /(\d+)\s*-\s*(\d+)\s*(?:minutes?|mins?|hours?|hrs?|seconds?|secs?)/
  );
  if (range) {
    const high = parseInt(range[2], 10);
    const unit = range[0].match(/(hours?|hrs?|minutes?|mins?|seconds?|secs?)/)![0];
    if (/hours?|hrs?/.test(unit)) {
      return { durationSeconds: toSeconds(high, 0, 0), label: buildLabel(high, 0, 0) };
    }
    if (/seconds?|secs?/.test(unit)) {
      return { durationSeconds: toSeconds(0, 0, high), label: buildLabel(0, 0, high) };
    }
    return { durationSeconds: toSeconds(0, high, 0), label: buildLabel(0, high, 0) };
  }

  // Simple: "25 minutes", "1 hour", "30 seconds"
  const simple = text.match(
    /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|minutes?|mins?|seconds?|secs?)/
  );
  if (simple) {
    const value = parseFloat(simple[1]);
    const unit = simple[0].match(/(hours?|hrs?|minutes?|mins?|seconds?|secs?)/)![0];
    if (/hours?|hrs?/.test(unit)) {
      const h = Math.floor(value);
      const m = Math.round((value - h) * 60);
      return { durationSeconds: toSeconds(h, m, 0), label: buildLabel(h, m, 0) };
    }
    if (/seconds?|secs?/.test(unit)) {
      return { durationSeconds: toSeconds(0, 0, Math.round(value)), label: buildLabel(0, 0, Math.round(value)) };
    }
    return { durationSeconds: toSeconds(0, Math.round(value), 0), label: buildLabel(0, Math.round(value), 0) };
  }

  return null;
}

/**
 * Formats seconds into a countdown string: "25:00", "1:30:00"
 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}
