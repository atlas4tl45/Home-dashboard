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

export type View =
  | { name: "home" }
  | { name: "room"; areaId: string }
  | { name: "cameras" }
  | { name: "security" }
  | { name: "settings" };
