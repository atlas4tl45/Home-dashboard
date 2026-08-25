// Helpers for reading and organising Home Assistant entities.

import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { Area } from "@/lib/types";
import type { Registry } from "@/lib/ha";

export const domainOf = (entityId: string): string =>
  entityId.slice(0, entityId.indexOf("."));

export const friendlyName = (e: HassEntity): string =>
  (e.attributes.friendly_name as string | undefined) ?? e.entity_id;

export const isUnavailable = (e: HassEntity): boolean =>
  e.state === "unavailable" || e.state === "unknown";

export const isOn = (e: HassEntity): boolean => e.state === "on";

/** Domains the dashboard renders as interactive room devices, in display order. */
export const ROOM_DOMAINS = ["light", "fan", "switch", "cover", "climate", "lock"] as const;

export interface Room {
  area: Area;
  /** Interactive devices, ordered by ROOM_DOMAINS then name. */
  devices: HassEntity[];
  cameras: HassEntity[];
  /** °-value of a representative temperature sensor, if the room has one. */
  temperature: string | null;
  lightsOn: number;
  lightCount: number;
}

const domainRank = new Map<string, number>(ROOM_DOMAINS.map((d, i) => [d, i]));

function pickTemperature(sensors: HassEntity[]): string | null {
  for (const s of sensors) {
    if (
      s.attributes.device_class === "temperature" &&
      !isUnavailable(s) &&
      !Number.isNaN(Number(s.state))
    ) {
      return `${Math.round(Number(s.state))}°`;
    }
  }
  return null;
}

/** Group every visible entity into its room. Rooms with nothing usable are dropped. */
export function buildRooms(entities: HassEntities, registry: Registry): Room[] {
  const byArea = new Map<string, HassEntity[]>();
  for (const entity of Object.values(entities)) {
    if (registry.hiddenEntities.has(entity.entity_id)) continue;
    const areaId = registry.entityArea[entity.entity_id];
    if (!areaId) continue;
    const list = byArea.get(areaId);
    if (list) list.push(entity);
    else byArea.set(areaId, [entity]);
  }

  const rooms: Room[] = [];
  for (const area of registry.areas) {
    const members = byArea.get(area.area_id) ?? [];
    const devices = members
      .filter((e) => domainRank.has(domainOf(e.entity_id)))
      .sort((a, b) => {
        const rank =
          domainRank.get(domainOf(a.entity_id))! -
          domainRank.get(domainOf(b.entity_id))!;
        return rank !== 0 ? rank : friendlyName(a).localeCompare(friendlyName(b));
      });
    const cameras = members.filter((e) => domainOf(e.entity_id) === "camera");
    if (devices.length === 0 && cameras.length === 0) continue;

    const lights = devices.filter((e) => domainOf(e.entity_id) === "light");
    rooms.push({
      area,
      devices,
      cameras,
      temperature: pickTemperature(
        members.filter((e) => domainOf(e.entity_id) === "sensor"),
      ),
      lightsOn: lights.filter(isOn).length,
      lightCount: lights.length,
    });
  }
  return rooms.sort((a, b) => a.area.name.localeCompare(b.area.name));
}

/** All entities of a domain, sorted by name. */
export function ofDomain(entities: HassEntities, domain: string): HassEntity[] {
  return Object.values(entities)
    .filter((e) => domainOf(e.entity_id) === domain)
    .sort((a, b) => friendlyName(a).localeCompare(friendlyName(b)));
}

const DISPLAY_DOMAINS = new Set<string>([
  ...ROOM_DOMAINS,
  "camera",
  "scene",
  "alarm_control_panel",
  "weather",
]);

const OPENING_CLASSES = ["door", "window", "garage_door", "opening"];

/** Can this entity appear somewhere on the dashboard? (Drives the Settings picker.) */
export function isDisplayable(e: HassEntity): boolean {
  const domain = domainOf(e.entity_id);
  if (DISPLAY_DOMAINS.has(domain)) return true;
  const cls = (e.attributes.device_class as string | undefined) ?? "";
  if (domain === "binary_sensor") return OPENING_CLASSES.includes(cls) || cls === "motion";
  if (domain === "sensor") return cls === "temperature";
  return false;
}

/**
 * Resolve a whole-home feature selection to an entity. Opt-in semantics:
 * undefined or "none" = feature off; "auto" = first healthy entity of the
 * domain; otherwise the chosen entity_id.
 */
export function resolveFeature(
  entities: HassEntities,
  selection: string | undefined,
  domain: string,
): HassEntity | undefined {
  if (!selection || selection === "none") return undefined;
  if (selection === "auto") {
    const all = ofDomain(entities, domain);
    return all.find((e) => !isUnavailable(e)) ?? all[0];
  }
  return entities[selection];
}

/** Entities that make sense inside a room (everything a room view renders). */
export function isRoomAssignable(e: HassEntity): boolean {
  const domain = domainOf(e.entity_id);
  return (
    isDisplayable(e) &&
    domain !== "scene" &&
    domain !== "alarm_control_panel" &&
    domain !== "weather"
  );
}

/** Doors, windows and other openings for the security screen. */
export function openingSensors(entities: HassEntities): HassEntity[] {
  const classes = new Set(["door", "window", "garage_door", "opening"]);
  return ofDomain(entities, "binary_sensor").filter((e) =>
    classes.has(e.attributes.device_class as string),
  );
}

/** Brightness as 0–100, or null when off/not dimmable. */
export function brightnessPct(e: HassEntity): number | null {
  const raw = e.attributes.brightness as number | undefined;
  if (raw == null) return null;
  return Math.round((raw / 255) * 100);
}

export function supportsBrightness(e: HassEntity): boolean {
  const modes = (e.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.some((m) => m !== "onoff");
}

export function supportsColorTemp(e: HassEntity): boolean {
  const modes = (e.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.includes("color_temp");
}

export function supportsColor(e: HassEntity): boolean {
  const modes = (e.attributes.supported_color_modes as string[] | undefined) ?? [];
  return modes.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
}

const CAMERA_STREAM = 2;

/** Can this camera provide a live stream, or only still snapshots? */
export function supportsStream(e: HassEntity): boolean {
  return (((e.attributes.supported_features as number) ?? 0) & CAMERA_STREAM) !== 0;
}

const COVER_SET_POSITION = 4;

export function supportsCoverPosition(e: HassEntity): boolean {
  return (((e.attributes.supported_features as number) ?? 0) & COVER_SET_POSITION) !== 0;
}

/** Human label for an entity's current state, tuned per domain. */
export function stateLabel(e: HassEntity): string {
  if (isUnavailable(e)) return "Unavailable";
  const domain = domainOf(e.entity_id);
  switch (domain) {
    case "light": {
      const pct = brightnessPct(e);
      return isOn(e) ? (pct != null ? `On · ${pct}%` : "On") : "Off";
    }
    case "fan": {
      const pct = e.attributes.percentage as number | undefined;
      return isOn(e) ? (pct ? `On · ${Math.round(pct)}%` : "On") : "Off";
    }
    case "lock":
      return e.state === "locked"
        ? "Locked"
        : e.state === "unlocked"
          ? "Unlocked"
          : e.state === "jammed"
            ? "Jammed"
            : capitalize(e.state);
    case "cover": {
      const pos = e.attributes.current_position as number | undefined;
      if (e.state === "open" && pos != null && pos < 100) return `Open · ${pos}%`;
      return capitalize(e.state);
    }
    case "climate": {
      const target = e.attributes.temperature as number | undefined;
      if (e.state === "off") return "Off";
      return target != null ? `${capitalize(e.state)} · ${target}°` : capitalize(e.state);
    }
    case "binary_sensor": {
      const cls = e.attributes.device_class as string | undefined;
      if (["door", "window", "garage_door", "opening"].includes(cls ?? ""))
        return isOn(e) ? "Open" : "Closed";
      if (cls === "motion") return isOn(e) ? "Motion" : "Clear";
      return isOn(e) ? "On" : "Off";
    }
    default:
      return capitalize(e.state.replace(/_/g, " "));
  }
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Home Assistant weather states are unspaced slugs; these read properly. */
export const WEATHER_LABELS: Record<string, string> = {
  "clear-night": "Clear",
  cloudy: "Cloudy",
  exceptional: "Severe",
  fog: "Fog",
  hail: "Hail",
  lightning: "Thunderstorms",
  "lightning-rainy": "Thunderstorms",
  partlycloudy: "Partly cloudy",
  pouring: "Heavy rain",
  rainy: "Rain",
  snowy: "Snow",
  "snowy-rainy": "Sleet",
  sunny: "Sunny",
  windy: "Windy",
  "windy-variant": "Windy",
};

export function weatherLabel(state: string): string {
  return WEATHER_LABELS[state] ?? capitalize(state.replace(/[-_]/g, " "));
}

export const ALARM_LABELS: Record<string, string> = {
  disarmed: "Disarmed",
  disarming: "Disarming…",
  armed_home: "Armed · Home",
  armed_away: "Armed · Away",
  armed_night: "Armed · Night",
  armed_vacation: "Armed · Vacation",
  arming: "Arming…",
  pending: "Alarm pending…",
  triggered: "ALARM TRIGGERED",
};
