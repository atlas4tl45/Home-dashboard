// Lock tile. Locking is one tap; unlocking is press-and-hold so a brush of
// the wall tablet can never open the house.

import { useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { Lock, LockOpen } from "lucide-react";
import { callService } from "@/lib/ha";
import { friendlyName, isUnavailable, stateLabel } from "@/lib/entities";

const HOLD_MS = 1200;

export function LockTile({ entity }: { entity: HassEntity }) {
  const unavailable = isUnavailable(entity);
  const locked = entity.state === "locked";
  const busy = entity.state === "locking" || entity.state === "unlocking";
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number>();

  function beginHold(e: React.PointerEvent<HTMLDivElement>) {
    if (unavailable || busy) return;
    if (!locked) {
      // Securing the house is always a single tap.
      void callService("lock", "lock", undefined, entity.entity_id);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      void callService("lock", "unlock", undefined, entity.entity_id);
    }, HOLD_MS);
  }

  function cancelHold() {
    window.clearTimeout(holdTimer.current);
    setHolding(false);
  }

  return (
    <div
      role="button"
      aria-label={friendlyName(entity)}
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      className={`glass pressable relative min-h-[6rem] touch-none overflow-hidden p-4 transition-colors duration-200 ${
        locked ? "" : "border-orange-200/30 bg-orange-100/10"
      } ${unavailable ? "opacity-40" : "cursor-pointer"}`}
    >
      {/* Hold-to-unlock progress sweep */}
      <div
        className="absolute inset-y-0 left-0 bg-orange-200/25"
        style={{
          width: holding ? "100%" : "0%",
          transition: holding ? `width ${HOLD_MS}ms linear` : "none",
        }}
      />
      <div className="relative flex h-full flex-col justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
            locked ? "bg-emerald-300 text-emerald-950" : "bg-orange-300 text-orange-950"
          }`}
        >
          {locked ? <Lock size={22} /> : <LockOpen size={22} />}
        </span>
        <span>
          <span className="block truncate text-[15px] font-medium leading-tight">
            {friendlyName(entity)}
          </span>
          <span className="block text-[13px] text-white/50">
            {holding ? "Hold to unlock…" : busy ? "Working…" : stateLabel(entity)}
          </span>
        </span>
      </div>
    </div>
  );
}
