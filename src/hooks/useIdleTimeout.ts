import { useEffect, useRef } from "react";

// A touch anywhere counts as activity. Pointer *movement* deliberately does
// not — a wall tablet has no hovering cursor, and ignoring it keeps the
// behaviour identical whether or not a mouse is attached.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel"] as const;

/**
 * Run `onIdle` once the screen has gone untouched for `delayMs`.
 * Pass 0/null for delay, or enabled=false, to disable.
 */
export function useIdleTimeout(
  delayMs: number | null,
  onIdle: () => void,
  enabled = true,
): void {
  const callback = useRef(onIdle);
  callback.current = onIdle;

  useEffect(() => {
    if (!enabled || !delayMs) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback.current(), delayMs);
    };
    reset();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, reset, { passive: true }),
    );
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, reset),
      );
    };
  }, [delayMs, enabled]);
}
