import { useCallback, useEffect, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";

const DEFAULT_TIMEOUT_MS = 30_000;
const TIMED_OUT_MS = 5000;

interface Options {
  /**
   * Wait this long before showing the indicator. Instant devices settle
   * first and never flash a spinner; slow ones (locks, garage doors) should
   * pass 0 so the press is acknowledged immediately.
   */
  showAfterMs?: number;
  /** Stop waiting after this long and report that the device didn't answer. */
  timeoutMs?: number;
}

/**
 * Tracks a command that takes time to land — a deadbolt turning, a garage
 * door moving, an alarm arming. `begin(isDone)` marks the entity as working
 * until Home Assistant reports the new state, so a press never looks ignored
 * (which is what makes people tap again and queue a second command).
 */
export function usePendingAction(entity: HassEntity, opts: Options = {}) {
  const { showAfterMs = 0, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const [isDone, setIsDone] = useState<((e: HassEntity) => boolean) | null>(null);
  const [visible, setVisible] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  const cancel = useCallback(() => {
    clearTimers();
    setIsDone(null);
    setVisible(false);
    setTimedOut(false);
  }, [clearTimers]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  // Clear the moment Home Assistant confirms the new state.
  useEffect(() => {
    if (isDone && isDone(entity)) cancel();
  }, [entity, isDone, cancel]);

  const begin = useCallback(
    (done: (e: HassEntity) => boolean) => {
      clearTimers();
      setTimedOut(false);
      setIsDone(() => done);
      if (showAfterMs === 0) setVisible(true);
      else
        timers.current.push(
          window.setTimeout(() => setVisible(true), showAfterMs),
        );
      timers.current.push(
        window.setTimeout(() => {
          setIsDone(null);
          setVisible(false);
          setTimedOut(true);
          timers.current.push(
            window.setTimeout(() => setTimedOut(false), TIMED_OUT_MS),
          );
        }, timeoutMs),
      );
    },
    [clearTimers, showAfterMs, timeoutMs],
  );

  return {
    /** Show the working indicator. */
    working: visible,
    /** A command is in flight — ignore repeat presses. */
    pending: isDone != null,
    /** The device never reported back. */
    timedOut,
    begin,
    cancel,
  };
}
