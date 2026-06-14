import type { HassEntity } from "home-assistant-js-websocket";

export type Theme = "light" | "dark" | "system";

/** A single entity placed into a room by the user. */
export interface RoomEntity {
  /** Home Assistant entity_id, e.g. "light.kitchen". */
  entity_id: string;
  /** Optional per-room display name override. */
  name?: string;
}

export interface Room {
  id: string;
  name: string;
  /** lucide icon name (see iconForName). */
  icon: string;
  entities: RoomEntity[];
}

export interface DashboardConfig {
  version: number;
  theme: Theme;
  /** Accent color key (see lib/accents.ts). */
  accent?: string;
  /** entity_id of a `weather.*` entity shown in the greeting header. */
  weatherEntity?: string;
  rooms: Room[];
}

/** Credentials for the client-side Home Assistant connection. */
export interface HaCredentials {
  url: string;
  token: string;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

/** Domains we render as first-class, interactive cards. */
export type SupportedDomain =
  | "light"
  | "switch"
  | "climate"
  | "lock"
  | "camera"
  | "alarm_control_panel"
  | "cover"
  | "fan"
  | "sensor"
  | "binary_sensor";

export type { HassEntity };
