// Connection layer for Home Assistant.
//
// The browser talks to Home Assistant directly over its WebSocket API using a
// long-lived access token. One shared Connection instance; helpers for live
// entity state, the area/device/entity registries (used to group devices into
// rooms), service calls, and signed URLs for camera images.

import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService as haCallService,
  ERR_INVALID_AUTH,
  ERR_CANNOT_CONNECT,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";
import type { Area, Credentials } from "@/lib/types";

export interface ForecastEntry {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
  wind_speed?: number;
  humidity?: number;
  is_daytime?: boolean;
}

let connection: Connection | null = null;

export class HaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HaError";
  }
}

function describeError(err: unknown): HaError {
  if (err === ERR_INVALID_AUTH) {
    return new HaError(
      "That token was rejected. Create a fresh long-lived access token in your Home Assistant profile (Security tab).",
    );
  }
  if (err === ERR_CANNOT_CONNECT) {
    return new HaError(
      "Couldn't reach Home Assistant at that address. Check the URL and that it's reachable from this tablet.",
    );
  }
  if (err instanceof Error) return new HaError(err.message);
  return new HaError("Something went wrong while connecting.");
}

/** Normalise a user-entered URL: trim, strip trailing slashes, default scheme. */
export function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

export async function connect(creds: Credentials): Promise<Connection> {
  disconnect();
  try {
    const auth = createLongLivedTokenAuth(normalizeUrl(creds.url), creds.token);
    connection = await createConnection({ auth });
    return connection;
  } catch (err) {
    throw describeError(err);
  }
}

export function disconnect(): void {
  if (!connection) return;
  try {
    connection.close();
  } catch {
    /* already closed */
  }
  connection = null;
}

export function getConnection(): Connection | null {
  return connection;
}

/** Subscribe to all entity states. Returns an unsubscribe function. */
export function subscribeStates(
  conn: Connection,
  cb: (entities: HassEntities) => void,
): () => void {
  return subscribeEntities(conn, cb);
}

interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
}

interface EntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  hidden_by: string | null;
  disabled_by: string | null;
  platform: string;
}

export interface Registry {
  areas: Area[];
  /** entity_id -> area_id, resolved through the device registry when needed. */
  entityArea: Record<string, string>;
  /** Entities the user hid or disabled inside Home Assistant. */
  hiddenEntities: Set<string>;
  /** entity_id -> integration that provides it (e.g. "alarmo"). */
  entityPlatform: Record<string, string>;
}

/**
 * Load the area/device/entity registries and resolve each entity to a room.
 * An entity's own area wins; otherwise it inherits its device's area.
 */
export async function fetchRegistry(conn: Connection): Promise<Registry> {
  const [areas, devices, entities] = await Promise.all([
    conn.sendMessagePromise<Area[]>({ type: "config/area_registry/list" }),
    conn.sendMessagePromise<DeviceRegistryEntry[]>({
      type: "config/device_registry/list",
    }),
    conn.sendMessagePromise<EntityRegistryEntry[]>({
      type: "config/entity_registry/list",
    }),
  ]);

  const deviceArea = new Map(devices.map((d) => [d.id, d.area_id]));
  const entityArea: Record<string, string> = {};
  const entityPlatform: Record<string, string> = {};
  const hiddenEntities = new Set<string>();

  for (const entry of entities) {
    if (entry.platform) entityPlatform[entry.entity_id] = entry.platform;
    if (entry.hidden_by || entry.disabled_by) {
      hiddenEntities.add(entry.entity_id);
      continue;
    }
    const areaId =
      entry.area_id ?? (entry.device_id ? deviceArea.get(entry.device_id) : null);
    if (areaId) entityArea[entry.entity_id] = areaId;
  }

  return {
    areas: areas.map((a) => ({ area_id: a.area_id, name: a.name })),
    entityArea,
    hiddenEntities,
    entityPlatform,
  };
}

// Demo mode routes service calls into local state instead of a live server.
type DemoHandler = (
  domain: string,
  service: string,
  data: Record<string, unknown> | undefined,
  entityId: string | undefined,
) => void;

let demoHandler: DemoHandler | null = null;
let demoForecast: ((type: string) => ForecastEntry[]) | null = null;

export function setDemoHandler(handler: DemoHandler): void {
  demoHandler = handler;
}

export function setDemoForecast(
  provider: (type: string) => ForecastEntry[],
): void {
  demoForecast = provider;
}

/** Fire a service call, e.g. callService("light", "turn_on", { brightness: 128 }, "light.sofa"). */
export async function callService(
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  entityId?: string | string[],
): Promise<void> {
  if (demoHandler) {
    // Some integrations (Alarmo) take entity_id as a service field rather
    // than a target; look in both.
    const target =
      (Array.isArray(entityId) ? entityId[0] : entityId) ??
      (data?.entity_id as string | undefined);
    demoHandler(domain, service, data, target);
    return;
  }
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  await haCallService(
    connection,
    domain,
    service,
    data,
    entityId ? { entity_id: entityId } : undefined,
  );
}

/**
 * Per-user key/value storage on the Home Assistant server (the same
 * `frontend/*_user_data` API the HA frontend uses for its own UI state).
 * The dashboard keeps its room/device setup here so it survives cleared
 * browser storage and follows the HA user across tablets.
 */
export async function getUserData<T>(key: string): Promise<T | null> {
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  const result = await connection.sendMessagePromise<{ value: T | null }>({
    type: "frontend/get_user_data",
    key,
  });
  return result?.value ?? null;
}

export async function setUserData(key: string, value: unknown): Promise<void> {
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  await connection.sendMessagePromise({
    type: "frontend/set_user_data",
    key,
    value,
  });
}

/**
 * Ask Home Assistant to start an HLS stream for a camera and return the
 * playlist path. Requires the `stream` integration and a camera that
 * supports streaming; returns null when it doesn't.
 */
export async function fetchCameraStream(entityId: string): Promise<string | null> {
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  try {
    const result = await connection.sendMessagePromise<{ url: string }>({
      type: "camera/stream",
      entity_id: entityId,
      format: "hls",
    });
    return result?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to a weather entity's forecast. Modern Home Assistant no longer
 * puts forecasts in the entity's attributes — they're pushed over this
 * subscription instead. Returns an unsubscribe function.
 */
export function subscribeForecast(
  entityId: string,
  forecastType: "daily" | "hourly" | "twice_daily",
  cb: (forecast: ForecastEntry[]) => void,
): () => void {
  if (demoForecast) {
    cb(demoForecast(forecastType));
    return () => {};
  }
  if (!connection) return () => {};
  const unsub = connection.subscribeMessage<{
    type: string;
    forecast: ForecastEntry[] | null;
  }>((message) => cb(message.forecast ?? []), {
    type: "weather/subscribe_forecast",
    entity_id: entityId,
    forecast_type: forecastType,
  });
  return () => {
    void unsub.then((fn) => fn()).catch(() => {});
  };
}

/**
 * Sign a Home Assistant path (camera_proxy, entity_picture, …) so <img> can
 * load it without an Authorization header.
 */
export async function signPath(path: string, expires = 300): Promise<string> {
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  const result = await connection.sendMessagePromise<{ path: string }>({
    type: "auth/sign_path",
    path,
    expires,
  });
  return result.path;
}
