// The workhorse tile for lights, fans, switches and covers.
//
// Interactions (Control-Center style):
//   • tap        — toggle on/off
//   • drag ⟷    — set brightness / speed / position, with a live glass fill
//   • long-press — open the detail sheet (when the parent provides one)

import { useEffect, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { Blinds, Fan, Lightbulb, Plug, Power, type LucideIcon } from "lucide-react";
import { callService } from "@/lib/ha";
import {
  brightnessPct,
  domainOf,
  friendlyName,
  isOn,
  isUnavailable,
  stateLabel,
  supportsBrightness,
  supportsCoverPosition,
} from "@/lib/entities";

interface Accent {
  tileOn: string;
  iconOn: string;
  fill: string;
}

// Pro-installer palette (Control4/Savant/Crestron): surfaces stay monochrome —
// an active tile simply turns bright white with ink icons. The one accent is
// warm amber, reserved for lights that are actually on.
const NEUTRAL: Accent = {
  tileOn: "border-white/90 bg-white/85",
  iconOn: "bg-slate-800 text-white",
  fill: "bg-slate-900/[0.06]",
};

const ACCENTS: Record<string, Accent> = {
  light: {
    tileOn: "border-white/90 bg-white/85",
    iconOn: "bg-amber-300 text-amber-950",
    fill: "bg-amber-300/35",
  },
  fan: NEUTRAL,
  switch: NEUTRAL,
  cover: NEUTRAL,
};

function iconFor(entity: HassEntity): LucideIcon {
  switch (domainOf(entity.entity_id)) {
    case "light":
      return Lightbulb;
    case "fan":
      return Fan;
    case "cover":
      return Blinds;
    default:
      return entity.attributes.device_class === "outlet" ? Plug : Power;
  }
}

/** Current adjustable level (0–100), or null when the device is on/off only. */
function levelOf(entity: HassEntity): number | null {
  switch (domainOf(entity.entity_id)) {
    case "light":
      return supportsBrightness(entity)
        ? isOn(entity)
          ? (brightnessPct(entity) ?? 100)
          : 0
        : null;
    case "fan": {
      if (entity.attributes.percentage == null) return null;
      return isOn(entity) ? Math.round(entity.attributes.percentage as number) : 0;
    }
    case "cover":
      return supportsCoverPosition(entity)
        ? ((entity.attributes.current_position as number | undefined) ?? null)
        : null;
    default:
      return null;
  }
}

function applyLevel(entity: HassEntity, pct: number): void {
  const id = entity.entity_id;
  switch (domainOf(id)) {
    case "light":
      if (pct === 0) void callService("light", "turn_off", undefined, id);
      else void callService("light", "turn_on", { brightness_pct: pct }, id);
      break;
    case "fan":
      void callService("fan", "set_percentage", { percentage: pct }, id);
      break;
    case "cover":
      void callService("cover", "set_cover_position", { position: pct }, id);
      break;
  }
}

function toggle(entity: HassEntity): void {
  const domain = domainOf(entity.entity_id);
  void callService(domain, "toggle", undefined, entity.entity_id);
}

const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 10;
const SEND_THROTTLE_MS = 250;

interface Props {
  entity: HassEntity;
  onLongPress?: () => void;
}

export function DeviceTile({ entity, onLongPress }: Props) {
  const domain = domainOf(entity.entity_id);
  const accent = ACCENTS[domain] ?? NEUTRAL;
  const Icon = iconFor(entity);
  const unavailable = isUnavailable(entity);
  const active = domain === "cover" ? entity.state === "open" : isOn(entity);
  const level = levelOf(entity);
  const adjustable = level != null && !unavailable;

  // While (and briefly after) dragging, show our value instead of HA's.
  const [override, setOverride] = useState<number | null>(null);
  const gesture = useRef<{
    startX: number;
    startLevel: number;
    width: number;
    dragging: boolean;
    longPressTimer: number;
    longPressFired: boolean;
    lastSend: number;
  } | null>(null);
  const settleTimer = useRef<number>();

  useEffect(() => {
    // HA confirmed a new level — drop the optimistic value unless mid-drag.
    if (!gesture.current?.dragging) setOverride(null);
  }, [level]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const shownLevel = override ?? level ?? 0;
  const showFill = adjustable && (active || (override ?? 0) > 0);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (unavailable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {
      startX: e.clientX,
      startLevel: shownLevel,
      width: e.currentTarget.offsetWidth,
      dragging: false,
      longPressFired: false,
      lastSend: 0,
      longPressTimer: window.setTimeout(() => {
        if (gesture.current && !gesture.current.dragging && onLongPress) {
          gesture.current.longPressFired = true;
          onLongPress();
        }
      }, LONG_PRESS_MS),
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.longPressFired) return;
    const dx = e.clientX - g.startX;
    if (!g.dragging) {
      if (!adjustable || Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      g.dragging = true;
      window.clearTimeout(g.longPressTimer);
    }
    const next = Math.round(
      Math.min(100, Math.max(0, g.startLevel + (dx / g.width) * 100)),
    );
    setOverride(next);
    const now = Date.now();
    if (now - g.lastSend >= SEND_THROTTLE_MS) {
      g.lastSend = now;
      applyLevel(entity, next);
    }
  }

  function onPointerUp() {
    const g = gesture.current;
    if (!g) return;
    window.clearTimeout(g.longPressTimer);
    gesture.current = null;
    if (g.longPressFired) return;
    if (g.dragging) {
      if (override != null) applyLevel(entity, override);
      // Give HA a moment to report back before trusting its state again.
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => setOverride(null), 2500);
    } else {
      toggle(entity);
    }
  }

  return (
    <div
      role="button"
      aria-label={friendlyName(entity)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`glass pressable relative min-h-[6rem] touch-none overflow-hidden p-4 transition-colors duration-200 ${
        active ? accent.tileOn : ""
      } ${unavailable ? "opacity-40" : "cursor-pointer"}`}
    >
      {showFill && (
        <div
          className={`absolute inset-y-0 left-0 ${accent.fill} ${
            gesture.current?.dragging ? "" : "transition-[width] duration-300"
          }`}
          style={{ width: `${shownLevel}%` }}
        />
      )}
      <div className="relative flex h-full flex-col justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
            active ? accent.iconOn : "bg-slate-900/[0.06] text-slate-600"
          }`}
        >
          <Icon size={22} strokeWidth={2} />
        </span>
        <span>
          <span className="block truncate text-[15px] font-medium leading-tight">
            {friendlyName(entity)}
          </span>
          <span className="block text-[13px] text-slate-500">
            {gesture.current?.dragging || override != null
              ? `${shownLevel}%`
              : stateLabel(entity)}
          </span>
        </span>
      </div>
    </div>
  );
}
