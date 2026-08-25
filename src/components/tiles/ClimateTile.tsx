// Thermostat tile: current temperature, target with big +/− steppers, and the
// available modes as small chips. Spans two columns in the room grid.

import type { HassEntity } from "home-assistant-js-websocket";
import { Minus, Plus, Thermometer } from "lucide-react";
import { callService } from "@/lib/ha";
import { capitalize, friendlyName, isUnavailable } from "@/lib/entities";

const MODE_LABELS: Record<string, string> = {
  off: "Off",
  heat: "Heat",
  cool: "Cool",
  heat_cool: "Auto",
  auto: "Auto",
  fan_only: "Fan",
  dry: "Dry",
};

// Heat/cool keep their conventional hues (muted); everything else stays ink.
const MODE_ON_CLASSES: Record<string, string> = {
  heat: "bg-orange-400 text-white",
  cool: "bg-sky-500 text-white",
  heat_cool: "bg-slate-800 text-white",
  auto: "bg-slate-800 text-white",
};

export function ClimateTile({ entity }: { entity: HassEntity }) {
  const unavailable = isUnavailable(entity);
  const off = entity.state === "off";
  const current = entity.attributes.current_temperature as number | undefined;
  const target = entity.attributes.temperature as number | undefined;
  const step = (entity.attributes.target_temp_step as number | undefined) ?? 1;
  const modes = ((entity.attributes.hvac_modes as string[] | undefined) ?? []).filter(
    (m) => MODE_LABELS[m],
  );

  function nudge(direction: 1 | -1) {
    if (target == null) return;
    void callService(
      "climate",
      "set_temperature",
      { temperature: Math.round((target + direction * step) * 10) / 10 },
      entity.entity_id,
    );
  }

  function setMode(mode: string) {
    void callService("climate", "set_hvac_mode", { hvac_mode: mode }, entity.entity_id);
  }

  return (
    <div
      className={`glass col-span-2 min-h-[6rem] p-4 ${unavailable ? "opacity-40" : ""}`}
    >
      <div className="flex h-full items-center gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            off || unavailable
              ? "bg-slate-900/[0.06] text-slate-600"
              : (MODE_ON_CLASSES[entity.state] ?? "bg-slate-800 text-white")
          }`}
        >
          <Thermometer size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-tight">
            {friendlyName(entity)}
          </span>
          <span className="block text-[13px] text-slate-500">
            {current != null ? `Now ${current}°` : capitalize(entity.state)}
            {!off && target != null ? ` · set to ${target}°` : ""}
          </span>
          {modes.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMode(mode)}
                  className={`pressable rounded-full px-3 py-1 text-[12px] font-medium ${
                    entity.state === mode
                      ? "bg-slate-900 text-white"
                      : "bg-slate-900/[0.06] text-slate-500"
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          )}
        </div>
        {target != null && !off && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Cooler"
              onClick={() => nudge(-1)}
              className="glass-pill pressable flex h-12 w-12 items-center justify-center"
            >
              <Minus size={20} />
            </button>
            <span className="w-14 text-center text-2xl font-light tabular-nums">
              {target}°
            </span>
            <button
              aria-label="Warmer"
              onClick={() => nudge(1)}
              className="glass-pill pressable flex h-12 w-12 items-center justify-center"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
