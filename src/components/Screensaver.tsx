// Idle screen for a wall tablet: a dark, quiet clock that replaces the
// dashboard so the panel isn't glowing at full brightness all night. Stays
// dark in either theme, drifts slowly to avoid burning a fixed image into
// the display, and any touch wakes it.

import { useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { ShieldCheck } from "lucide-react";
import { useClock } from "@/hooks/useClock";
import { useStore } from "@/store/store";
import { useVisibleEntities } from "@/hooks/useVisibleEntities";
import {
  ALARM_LABELS,
  capitalize,
  resolveFeature,
  weatherLabel,
} from "@/lib/entities";

// A tap ends as pointerdown → pointerup → click. Unmounting on the first of
// those hands the rest to whatever is underneath — waking the screen over a
// room tile would open that room. So stay mounted for the whole gesture,
// fade out, and only then hand control back.
const DISMISS_MS = 400;

export function Screensaver({ onWake }: { onWake: () => void }) {
  const now = useClock();
  const [dismissing, setDismissing] = useState(false);
  const timer = useRef<number>();

  function wake(event: React.SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (dismissing) return;
    setDismissing(true);
    timer.current = window.setTimeout(onWake, DISMISS_MS);
  }

  const swallow = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const entities = useVisibleEntities();
  const features = useStore((s) => s.features);
  const weather = resolveFeature(entities, features.weather, "weather");
  const alarm = resolveFeature(entities, features.alarm, "alarm_control_panel");
  const armed = alarm?.state.startsWith("armed") ?? false;

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const meridiem = /([AP]M)$/i.exec(time)?.[1];
  const clock = meridiem ? time.slice(0, -meridiem.length).trim() : time;

  return (
    <div
      role="button"
      aria-label="Wake dashboard"
      onPointerDown={wake}
      onPointerUp={swallow}
      onClick={swallow}
      onTouchEnd={swallow}
      className={`animate-rise fixed inset-0 z-[60] flex items-center justify-center bg-[#05070d] text-white/80 transition-opacity duration-300 ${
        dismissing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-screensaver-drift flex flex-col items-center gap-3">
        <div className="whitespace-nowrap text-[clamp(5rem,16vw,11rem)] font-extralight leading-none tracking-tight tabular-nums">
          {clock}
          {meridiem && (
            <span className="ml-4 text-[0.28em] font-light text-white/40">
              {meridiem}
            </span>
          )}
        </div>
        <div className="text-[17px] font-light text-white/40">
          {now.toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="mt-1 flex items-center gap-5 text-[15px] text-white/35">
          {weather && <WeatherSummary entity={weather} />}
          {armed && alarm && (
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400/70" />
              {ALARM_LABELS[alarm.state] ?? capitalize(alarm.state)}
            </span>
          )}
        </div>
      </div>
      <span className="absolute bottom-10 text-[13px] text-white/20">
        Touch to wake
      </span>
    </div>
  );
}

function WeatherSummary({ entity }: { entity: HassEntity }) {
  const temp = entity.attributes.temperature as number | undefined;
  const unit = (entity.attributes.temperature_unit as string | undefined) ?? "°";
  return (
    <span>
      {temp != null ? `${Math.round(temp)}${unit}` : ""}
      {temp != null ? " · " : ""}
      {weatherLabel(entity.state)}
    </span>
  );
}
