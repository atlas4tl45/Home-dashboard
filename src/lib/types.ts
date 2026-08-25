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
 * Which entities power the whole-home features. Everything is opt-in:
 * a missing key (or "none") means the feature is off, "auto" means the
 * first suitable entity, anything else is a specific entity_id. Scenes
 * are a plain opt-in list.
 */
export interface FeatureSelections {
  alarm?: string;
  weather?: string;
  scenes?: string[];
}

/**
 * Idle behaviour for a wall tablet. Milliseconds; 0 disables.
 */
export interface KioskSettings {
  /** Go back to the home screen after this long without a touch. */
  returnHomeMs: number;
  /** Show the clock screensaver after this long without a touch. */
  screensaverMs: number;
  /** Drop Settings from the dock; reach it by tapping the clock instead. */
  hideSettings: boolean;
  /** Optional PIN required to open Settings. Not a secret — a guest gate. */
  pin: string | null;
}

export const DEFAULT_KIOSK: KioskSettings = {
  returnHomeMs: 120_000,
  screensaverMs: 600_000,
  hideSettings: false,
  pin: null,
};

/**
 * Taps on the clock that reveal a hidden Settings. The limit is the pause
 * *between* taps, not a total deadline — tap at whatever pace feels natural,
 * it only resets if you stop.
 */
export const SECRET_TAPS = 5;
export const SECRET_TAP_GAP_MS = 1500;

/**
 * The dashboard setup that syncs to the Home Assistant user profile, so a
 * kiosk that loses browser storage — or a brand-new tablet — picks it up
 * automatically on connect.
 */
export interface TabletConfig {
  customRooms: CustomRoom[];
  /** Display names for this dashboard, keyed by entity_id. */
  entityNames: Record<string, string>;
  hiddenAreas: string[];
  hiddenEntities: string[];
  features: FeatureSelections;
  kiosk: KioskSettings;
}

export type View =
  | { name: "home" }
  | { name: "room"; areaId: string }
  | { name: "cameras" }
  | { name: "security" }
  | { name: "settings" };
