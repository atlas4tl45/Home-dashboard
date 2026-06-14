import { Minus, Plus, Thermometer } from "lucide-react";
import { CardShell } from "./CardShell";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { isUnavailable } from "@/lib/entities";

const MODE_LABELS: Record<string, string> = {
  off: "Off",
  heat: "Heat",
  cool: "Cool",
  heat_cool: "Auto",
  auto: "Auto",
  dry: "Dry",
  fan_only: "Fan",
};

export function ClimateCard({ entity, name, editing, onRemove }: CardProps) {
  const unavailable = isUnavailable(entity);
  const attrs = entity?.attributes ?? {};
  const current = attrs.current_temperature;
  const target = attrs.temperature;
  const unit = attrs.temperature_unit ?? "°";
  const step = attrs.target_temp_step ?? 0.5;
  const min = attrs.min_temp ?? 7;
  const max = attrs.max_temp ?? 35;
  const mode = entity?.state ?? "off";
  const modes: string[] = attrs.hvac_modes ?? ["off", "heat", "cool"];
  const on = mode !== "off";

  const setTemp = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    callService("climate", "set_temperature", { temperature: clamped }, {
      entity_id: entity!.entity_id,
    });
  };

  const setMode = (m: string) =>
    callService("climate", "set_hvac_mode", { hvac_mode: m }, {
      entity_id: entity!.entity_id,
    });

  return (
    <CardShell
      icon={Thermometer}
      name={name}
      subtitle={
        unavailable
          ? "Unavailable"
          : current != null
            ? `Now ${current}${unit}`
            : MODE_LABELS[mode] ?? mode
      }
      active={on}
      unavailable={unavailable}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <>
          {target != null && (
            <div className="flex items-center justify-between">
              <button
                className="btn-outline h-9 w-9 p-0"
                onClick={() => setTemp(Number(target) - step)}
                aria-label="Lower temperature"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="text-2xl font-semibold tabular-nums">
                {target}
                <span className="text-base text-muted">{unit}</span>
              </div>
              <button
                className="btn-outline h-9 w-9 p-0"
                onClick={() => setTemp(Number(target) + step)}
                aria-label="Raise temperature"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  m === mode
                    ? "bg-accent text-accent-fg"
                    : "bg-surface-2 text-muted hover:text-content"
                }`}
              >
                {MODE_LABELS[m] ?? m}
              </button>
            ))}
          </div>
        </>
      )}
    </CardShell>
  );
}
