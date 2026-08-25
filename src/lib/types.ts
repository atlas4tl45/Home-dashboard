import type { HassEntities, HassEntity } from "home-assistant-js-websocket";

export type { HassEntities, HassEntity };

export interface Credentials {
  url: string;
  token: string;
}

/** A room, derived from the Home Assistant area registry. */
export interface Area {
  area_id: string;
  name: string;
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export type Theme = "auto" | "light" | "dark";

/** A room created on this tablet (no Home Assistant areas required). */
export interface CustomRoom {
  id: string;
  name: string;
  entityIds: string[];
}

/**
 * Which entity powers a whole-home feature (alarm chip, weather chip, …).
 * Missing key = automatic (first suitable entity); "none" = feature off;
 * anything else is a specific entity_id.
 */
export interface FeatureSelections {
  alarm?: string;
  weather?: string;
}

/**
 * The dashboard setup that syncs to the Home Assistant user profile, so a
 * kiosk that loses browser storage — or a brand-new tablet — picks it up
 * automatically on connect.
 */
export interface TabletConfig {
  customRooms: CustomRoom[];
  hiddenAreas: string[];
  hiddenEntities: string[];
  features: FeatureSelections;
}

export type View =
  | { name: "home" }
  | { name: "room"; areaId: string }
  | { name: "cameras" }
  | { name: "security" }
  | { name: "settings" };
