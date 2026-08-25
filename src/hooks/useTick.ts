import { useEffect, useState } from "react";

/**
 * Re-render on an interval while `active` — for second-by-second countdowns
 * (exit and entry delays) that the entity itself doesn't push updates for.
 */
export function useTick(active: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return now;
}
