import type { HassEntity } from "@/types";

/** "light.kitchen" -> "light" */
export function domainOf(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

export function friendlyName(entity: HassEntity | undefined, fallback?: string): string {
  return (
    entity?.attributes?.friendly_name ||
    fallback ||
    entity?.entity_id?.split(".")[1]?.replace(/_/g, " ") ||
    "Unknown"
  );
}

/** Is this entity in an "on"/active state? */
export function isActive(entity: HassEntity | undefined): boolean {
  if (!entity) return false;
  const s = entity.state;
  if (["on", "open", "unlocked", "home", "playing", "active"].includes(s)) {
    return true;
  }
  if (domainOf(entity.entity_id) === "climate") {
    return s !== "off" && s !== "unavailable";
  }
  if (domainOf(entity.entity_id) === "alarm_control_panel") {
    return s.startsWith("armed");
  }
  return false;
}

export function isUnavailable(entity: HassEntity | undefined): boolean {
  return !entity || entity.state === "unavailable" || entity.state === "unknown";
}

/** brightness (0-255) -> percent 0-100 */
export function brightnessToPct(brightness?: number): number {
  if (brightness == null) return 0;
  return Math.round((brightness / 255) * 100);
}

export function pctToBrightness(pct: number): number {
  return Math.round((pct / 100) * 255);
}

/** Human label for an entity's current state. */
export function stateLabel(entity: HassEntity | undefined): string {
  if (!entity) return "Unavailable";
  const uom = entity.attributes?.unit_of_measurement;
  const s = entity.state;
  if (s === "unavailable") return "Unavailable";
  if (s === "unknown") return "Unknown";
  const pretty = s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
  return uom ? `${s} ${uom}` : pretty;
}

/** Domains that have a dedicated interactive card. */
export const CARD_DOMAINS = new Set([
  "light",
  "switch",
  "climate",
  "lock",
  "camera",
  "alarm_control_panel",
  "cover",
  "fan",
  "scene",
  "media_player",
  "sensor",
  "binary_sensor",
]);

export const DOMAIN_LABELS: Record<string, string> = {
  light: "Light",
  switch: "Switch",
  climate: "Climate",
  lock: "Lock",
  camera: "Camera",
  alarm_control_panel: "Alarm",
  cover: "Cover",
  fan: "Fan",
  scene: "Scene",
  sensor: "Sensor",
  binary_sensor: "Binary Sensor",
  media_player: "Media Player",
};
