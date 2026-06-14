// Thin wrapper around the official `home-assistant-js-websocket` client.
//
// The browser connects directly to Home Assistant using a long-lived access
// token. We keep a single shared Connection instance and expose helpers for
// the things the dashboard actually needs: live entity state, service calls,
// and signed camera URLs.

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
import type { HaCredentials } from "@/types";

let connection: Connection | null = null;

export class HaError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
    this.name = "HaError";
  }
}

function describeError(err: unknown): HaError {
  if (err === ERR_INVALID_AUTH) {
    return new HaError(
      "Invalid access token. Generate a new long-lived token in your Home Assistant profile.",
      ERR_INVALID_AUTH,
    );
  }
  if (err === ERR_CANNOT_CONNECT) {
    return new HaError(
      "Could not reach Home Assistant at that URL. Check the address and that it's accessible from this device.",
      ERR_CANNOT_CONNECT,
    );
  }
  if (err instanceof Error) return new HaError(err.message);
  return new HaError("Unknown connection error.");
}

/** Normalise a user-entered URL (strip trailing slash, default to https). */
export function normalizeUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

export async function connect(creds: HaCredentials): Promise<Connection> {
  if (connection) {
    try {
      connection.close();
    } catch {
      /* ignore */
    }
    connection = null;
  }

  const url = normalizeUrl(creds.url);
  try {
    const auth = createLongLivedTokenAuth(url, creds.token);
    connection = await createConnection({ auth });
    return connection;
  } catch (err) {
    throw describeError(err);
  }
}

export function getConnection(): Connection | null {
  return connection;
}

export function disconnect(): void {
  if (connection) {
    try {
      connection.close();
    } catch {
      /* ignore */
    }
    connection = null;
  }
}

/** Subscribe to all entity states. Returns an unsubscribe function. */
export function subscribe(
  conn: Connection,
  cb: (entities: HassEntities) => void,
): () => void {
  return subscribeEntities(conn, cb);
}

/** Fire a Home Assistant service call against a specific entity. */
export async function callService(
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  target?: { entity_id?: string | string[] },
): Promise<void> {
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  await haCallService(connection, domain, service, data, target);
}

/** Call a service that returns response data (e.g. weather/calendar fetches). */
export async function callServiceWithResponse<T = any>(
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  target?: { entity_id?: string | string[] },
): Promise<T> {
  if (!connection) throw new HaError("Not connected to Home Assistant.");
  const result = await connection.sendMessagePromise<{ response: T }>({
    type: "call_service",
    domain,
    service,
    service_data: data,
    target,
    return_response: true,
  });
  return result.response;
}

/**
 * Ask Home Assistant to sign a path so it can be loaded by the browser without
 * an Authorization header (needed for <img>/<video> camera sources).
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

export const reconnectListeners = {
  onDisconnect(conn: Connection, cb: () => void) {
    conn.addEventListener("disconnected", cb);
    return () => conn.removeEventListener("disconnected", cb);
  },
  onReconnect(conn: Connection, cb: () => void) {
    conn.addEventListener("ready", cb);
    return () => conn.removeEventListener("ready", cb);
  },
};
