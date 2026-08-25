// Detail sheet for a light (opened by long-pressing its tile): a large
// brightness slider plus colour-temperature presets and colours when the
// bulb supports them.

import { useEffect, useRef, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "@/lib/ha";
import {
  brightnessPct,
  friendlyName,
  isOn,
  supportsColor,
  supportsColorTemp,
} from "@/lib/entities";
import { Sheet } from "@/components/Sheet";

const TEMP_PRESETS = [
  { label: "Candle", kelvin: 2200, swatch: "#ff9d3e" },
  { label: "Warm", kelvin: 2700, swatch: "#ffb765" },
  { label: "Soft", kelvin: 3200, swatch: "#ffd9a3" },
  { label: "Neutral", kelvin: 4000, swatch: "#fff0d8" },
  { label: "Cool", kelvin: 5500, swatch: "#eef4ff" },
];

const COLORS = [
  "#ff5f57",
  "#ff9f43",
  "#ffd93d",
  "#6bcf63",
  "#4cd7d0",
  "#54a0ff",
  "#8c7bff",
  "#ff6bd6",
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function LightSheet({
  entity,
  onClose,
}: {
  entity: HassEntity;
  onClose: () => void;
}) {
  const id = entity.entity_id;
  const [pct, setPct] = useState(() => (isOn(entity) ? (brightnessPct(entity) ?? 100) : 0));
  const lastSend = useRef(0);

  // Follow external changes while the sheet is open (unless we just sent one).
  const liveLevel = isOn(entity) ? (brightnessPct(entity) ?? 100) : 0;
  useEffect(() => {
    if (Date.now() - lastSend.current > 1500) setPct(liveLevel);
  }, [liveLevel]);

  function sendBrightness(value: number, force = false) {
    const now = Date.now();
    if (!force && now - lastSend.current < 250) return;
    lastSend.current = now;
    if (value === 0) void callService("light", "turn_off", undefined, id);
    else void callService("light", "turn_on", { brightness_pct: value }, id);
  }

  return (
    <Sheet title={friendlyName(entity)} onClose={onClose}>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        aria-label="Brightness"
        onChange={(e) => {
          const value = Number(e.target.value);
          setPct(value);
          sendBrightness(value);
        }}
        onPointerUp={() => sendBrightness(pct, true)}
        className="brightness-slider w-full"
        style={{ ["--fill" as string]: `${pct}%` }}
      />
      <div className="mt-1 text-center text-sm text-ink/55">
        {pct === 0 ? "Off" : `${pct}%`}
      </div>

      {supportsColorTemp(entity) && (
        <div className="mt-5">
          <div className="mb-2 text-[13px] font-medium text-ink/55">White tones</div>
          <div className="flex justify-between gap-2">
            {TEMP_PRESETS.map((preset) => (
              <button
                key={preset.kelvin}
                onClick={() =>
                  void callService(
                    "light",
                    "turn_on",
                    { color_temp_kelvin: preset.kelvin },
                    id,
                  )
                }
                className="pressable flex flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className="h-11 w-11 rounded-full border border-ink/10"
                  style={{ background: preset.swatch }}
                />
                <span className="text-[11px] text-ink/55">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {supportsColor(entity) && (
        <div className="mt-5">
          <div className="mb-2 text-[13px] font-medium text-ink/55">Colors</div>
          <div className="grid grid-cols-8 gap-2">
            {COLORS.map((hex) => (
              <button
                key={hex}
                aria-label={`Set color ${hex}`}
                onClick={() =>
                  void callService("light", "turn_on", { rgb_color: hexToRgb(hex) }, id)
                }
                className="pressable aspect-square rounded-full border border-ink/10"
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
