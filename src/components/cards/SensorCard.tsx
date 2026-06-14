import { CardShell } from "./CardShell";
import type { CardProps } from "./types";
import { domainIcon } from "@/lib/icons";
import { domainOf, isActive, isUnavailable, stateLabel } from "@/lib/entities";

/** Read-only display for sensors and binary_sensors. */
export function SensorCard({ entity, name, editing, onRemove }: CardProps) {
  const unavailable = isUnavailable(entity);
  const domain = domainOf(entity?.entity_id ?? "sensor.x");
  const Icon = domainIcon(domain);
  const value =
    entity?.attributes?.unit_of_measurement && entity.state
      ? `${entity.state} ${entity.attributes.unit_of_measurement}`
      : stateLabel(entity);

  return (
    <CardShell
      icon={Icon}
      name={name}
      active={isActive(entity)}
      unavailable={unavailable}
      onRemove={editing ? onRemove : undefined}
    >
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </CardShell>
  );
}
