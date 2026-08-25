import { useCallback, useRef } from "react";
import { SECRET_TAP_WINDOW_MS, SECRET_TAPS } from "@/lib/types";

/**
 * Returns a tap handler that fires only after several quick taps in a row —
 * the way Settings stays reachable on a wall panel without being reachable
 * by everyone who walks past it.
 */
export function useSecretTaps(
  onTrigger: () => void,
  taps = SECRET_TAPS,
  windowMs = SECRET_TAP_WINDOW_MS,
): () => void {
  const recent = useRef<number[]>([]);
  return useCallback(() => {
    const now = Date.now();
    recent.current = [
      ...recent.current.filter((at) => now - at < windowMs),
      now,
    ];
    if (recent.current.length >= taps) {
      recent.current = [];
      onTrigger();
    }
  }, [onTrigger, taps, windowMs]);
}
