import { Power } from "lucide-react";
import { CardShell } from "./CardShell";
import { Toggle } from "@/components/ui/Toggle";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { domainOf, isActive, isUnavailable } from "@/lib/entities";

/** Handles `switch` and `fan` on/off, plus generic toggleables. */
export function SwitchCard({ entity, name, editing, onRemove }: CardProps) {
  const on = isActive(entity);
  const unavailable = isUnavailable(entity);
  const domain = domainOf(entity?.entity_id ?? "switch.x");

  const toggle = (next: boolean) =>
    callService(domain, next ? "turn_on" : "turn_off", undefined, {
      entity_id: entity!.entity_id,
    });

  return (
    <CardShell
      icon={Power}
      name={name}
      subtitle={unavailable ? "Unavailable" : on ? "On" : "Off"}
      active={on}
      unavailable={unavailable}
      onIconClick={() => toggle(!on)}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <div className="flex justify-end">
          <Toggle checked={on} onChange={toggle} aria-label={`Toggle ${name}`} />
        </div>
      )}
    </CardShell>
  );
}
