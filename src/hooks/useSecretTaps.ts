import { useCallback, useEffect, useRef, useState } from "react";
import { SECRET_TAP_GAP_MS, SECRET_TAPS } from "@/lib/types";

/**
 * Counts repeated taps to reveal something hidden — how Settings stays
 * reachable on a wall panel without being reachable by everyone walking past.
 *
 * Counts pointer *presses*, not clicks: a touch that drifts a pixel never
 * produces a click, which made this feel unreliable. The run resets only
 * after a pause, so any comfortable tapping pace works, and `progress` lets
 * the caller show that taps are landing.
 */
export function useSecretTaps(
  onTrigger: () => void,
  taps = SECRET_TAPS,
  gapMs = SECRET_TAP_GAP_MS,
): { onTap: () => void; progress: number } {
  const [progress, setProgress] = useState(0);
  const count = useRef(0);
  const lastTap = useRef(0);
  const resetTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const onTap = useCallback(() => {
    const now = Date.now();
    count.current = now - lastTap.current > gapMs ? 1 : count.current + 1;
    lastTap.current = now;
    window.clearTimeout(resetTimer.current);

    if (count.current >= taps) {
      count.current = 0;
      setProgress(0);
      onTrigger();
      return;
    }
    setProgress(count.current);
    resetTimer.current = window.setTimeout(() => {
      count.current = 0;
      setProgress(0);
    }, gapMs);
  }, [onTrigger, taps, gapMs]);

  return { onTap, progress };
}
