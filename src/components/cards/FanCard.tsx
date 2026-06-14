import { useEffect, useState } from "react";
import { Fan } from "lucide-react";
import { CardShell } from "./CardShell";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { isActive, isUnavailable } from "@/lib/entities";

export function FanCard({ entity, name, editing, onRemove }: CardProps) {
  const on = isActive(entity);
  const unavailable = isUnavailable(entity);
  const supportsSpeed = entity?.attributes?.percentage != null;
  const [pct, setPct] = useState<number>(entity?.attributes?.percentage ?? 0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) setPct(entity?.attributes?.percentage ?? 0);
  }, [entity?.attributes?.percentage, dragging]);

  const toggle = (next: boolean) =>
    callService("fan", next ? "turn_on" : "turn_off", undefined, {
      entity_id: entity!.entity_id,
    });

  const commit = (value: number) => {
    setDragging(false);
    callService("fan", "set_percentage", { percentage: value }, {
      entity_id: entity!.entity_id,
    });
  };

  return (
    <CardShell
      icon={Fan}
      name={name}
      subtitle={unavailable ? "Unavailable" : on ? (supportsSpeed ? `On · ${pct}%` : "On") : "Off"}
      active={on}
      unavailable={unavailable}
      onIconClick={() => toggle(!on)}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <div className="flex items-center gap-3">
          {supportsSpeed ? (
            <Slider
              value={on ? pct : 0}
              aria-label={`${name} speed`}
              onChange={(v) => {
                setDragging(true);
                setPct(v);
              }}
              onCommit={commit}
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
