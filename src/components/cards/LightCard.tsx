import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { CardShell } from "./CardShell";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { brightnessToPct, isActive, isUnavailable, pctToBrightness } from "@/lib/entities";

export function LightCard({ entity, name, editing, onRemove }: CardProps) {
  const on = isActive(entity);
  const unavailable = isUnavailable(entity);
  const supportsBrightness =
    entity?.attributes?.supported_color_modes?.some(
      (m: string) => m !== "onoff",
    ) ?? entity?.attributes?.brightness != null;

  // Local brightness for snappy dragging; synced from entity when not dragging.
  const [pct, setPct] = useState(brightnessToPct(entity?.attributes?.brightness));
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) setPct(brightnessToPct(entity?.attributes?.brightness));
  }, [entity?.attributes?.brightness, dragging]);

  const toggle = (next: boolean) =>
    callService("light", next ? "turn_on" : "turn_off", undefined, {
      entity_id: entity!.entity_id,
    });

  const commitBrightness = (value: number) => {
    setDragging(false);
    if (value === 0) {
      callService("light", "turn_off", undefined, { entity_id: entity!.entity_id });
    } else {
      callService("light", "turn_on", { brightness: pctToBrightness(value) }, {
        entity_id: entity!.entity_id,
      });
    }
  };

  return (
    <CardShell
      icon={Lightbulb}
      name={name}
      subtitle={unavailable ? "Unavailable" : on ? `On · ${pct}%` : "Off"}
      active={on}
      tone="warm"
      unavailable={unavailable}
      onIconClick={() => toggle(!on)}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <div className="flex items-center gap-3">
          {supportsBrightness ? (
            <Slider
              value={on ? pct : 0}
              aria-label={`${name} brightness`}
              onChange={(v) => {
                setDragging(true);
                setPct(v);
              }}
              onCommit={commitBrightness}
            />
          ) : (
            <span className="text-sm text-muted">{on ? "On" : "Off"}</span>
          )}
          <Toggle checked={on} onChange={toggle} aria-label={`Toggle ${name}`} />
        </div>
      )}
    </CardShell>
  );
}
