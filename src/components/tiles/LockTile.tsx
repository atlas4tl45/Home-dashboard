// Lock tile. Locking is one tap; unlocking is press-and-hold so a brush of
// the wall tablet can never open the house. Deadbolts take several seconds
// to turn, so a press immediately shows a working state — and says so if the
// lock never reports back.

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, LockOpen, TriangleAlert } from "lucide-react";
import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "@/lib/ha";
import { friendlyName, isUnavailable, stateLabel } from "@/lib/entities";
import { usePendingAction } from "@/hooks/usePendingAction";

const HOLD_MS = 1200;

export function LockTile({ entity }: { entity: HassEntity }) {
  const unavailable = isUnavailable(entity);
  const locked = entity.state === "locked";
  // A deadbolt that failed to turn — worth flagging, not silently showing
  // as unlocked.
  const jammed = entity.state === "jammed";
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number>();
  const { working, pending, timedOut, begin, cancel } = usePendingAction(entity);

  // Direction of the command in flight, for the label and icon.
  const reported =
    entity.state === "locking"
      ? "lock"
      : entity.state === "unlocking"
        ? "unlock"
        : null;
  const [target, setTarget] = useState<"lock" | "unlock" | null>(null);
  useEffect(() => {
    if (!pending) setTarget(null);
  }, [pending]);

  const busy = working || reported != null;
  const direction = target ?? reported;

  function run(action: "lock" | "unlock") {
    setTarget(action);
    begin((e) => e.state === (action === "lock" ? "locked" : "unlocked"));
    callService("lock", action, undefined, entity.entity_id).catch(cancel);
  }

  function beginHold(e: React.PointerEvent<HTMLDivElement>) {
    if (unavailable || busy || pending) return;
    if (!locked) {
      // Securing the house is always a single tap.
      run("lock");
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      run("unlock");
    }, HOLD_MS);
  }

  function cancelHold() {
    window.clearTimeout(holdTimer.current);
    setHolding(false);
  }

  const alert = (timedOut && !busy) || jammed;
  const detail = busy
    ? direction === "unlock"
      ? "Unlocking…"
      : "Locking…"
    : timedOut
      ? "No response"
      : holding
        ? "Hold to unlock…"
        : stateLabel(entity);

  return (
    <div
      role="button"
      aria-label={friendlyName(entity)}
      aria-busy={busy}
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      className={`glass pressable relative min-h-[6rem] touch-none overflow-hidden p-4 transition-colors duration-200 ${
        locked || busy ? "" : "border-orange-500/30 bg-orange-200/25"
      } ${alert ? "border-red-500/30" : ""} ${
        unavailable ? "opacity-40" : "cursor-pointer"
      }`}
    >
      {/* Hold-to-unlock progress sweep */}
      <div
        className="absolute inset-y-0 left-0 bg-orange-300/40"
        style={{
          width: holding ? "100%" : "0%",
          transition: holding ? `width ${HOLD_MS}ms linear` : "none",
        }}
      />
      <div className="relative flex h-full flex-col justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
            busy
              ? "bg-ink/[0.06] text-ink/70"
              : alert
                ? "bg-red-500 text-white"
                : locked
                  ? "bg-ink text-ink-contrast"
                  : "bg-orange-400 text-white"
          }`}
        >
          {busy ? (
            <Loader2 size={22} className="animate-spin" />
          ) : alert ? (
            <TriangleAlert size={22} />
          ) : locked ? (
            <Lock size={22} />
          ) : (
            <LockOpen size={22} />
          )}
        </span>
        <span>
          <span className="block truncate text-[15px] font-medium leading-tight">
            {friendlyName(entity)}
          </span>
          <span
            className={`block text-[13px] ${
              alert ? "text-red-600 dark:text-red-400" : "text-ink/55"
            }`}
          >
            {detail}
          </span>
        </span>
      </div>
    </div>
  );
}
