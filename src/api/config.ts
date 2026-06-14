// Client for dashboard config (rooms / entities / theme).
//
// Works in two deployment modes, transparently:
//   1. With the Express backend (npm start)  -> config is stored server-side
//      as JSON and synced across devices.
//   2. On a static host (e.g. Cloudflare Pages, Netlify) where there is no
//      backend -> config falls back to this browser's localStorage so the
//      dashboard is fully functional (per-device, like a static app).

import type { DashboardConfig } from "@/types";

const BASE = "/api/config";
const LS_KEY = "hd.config";

/** Sensible first-run config (mirrors the server default). */
const DEFAULT_CONFIG: DashboardConfig = {
  version: 1,
  theme: "system",
  rooms: [{ id: "living-room", name: "Living Room", icon: "sofa", entities: [] }],
};

// null = unknown (not yet probed), true/false once we know.
let backendAvailable: boolean | null = null;

function readLocal(): DashboardConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as DashboardConfig;
  } catch {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}

function writeLocal(config: DashboardConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** A response only counts as a real backend if it returns JSON, not an SPA fallback page. */
function isJson(res: Response): boolean {
  return res.headers.get("content-type")?.includes("application/json") ?? false;
}

export async function fetchConfig(): Promise<DashboardConfig> {
  try {
    const res = await fetch(BASE, { headers: { Accept: "application/json" } });
    if (res.ok && isJson(res)) {
      backendAvailable = true;
      const config = (await res.json()) as DashboardConfig;
      // Keep a local mirror so a later offline load still works.
      writeLocal(config);
      return config;
    }
    throw new Error("no backend");
  } catch {
    // No backend (static host) — use localStorage.
    backendAvailable = false;
    return readLocal();
  }
}

export async function saveConfig(
  config: DashboardConfig,
): Promise<DashboardConfig> {
  // Always mirror locally so we never lose the user's edits.
  writeLocal(config);

  if (backendAvailable === false) return config;

  try {
    const res = await fetch(BASE, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok && isJson(res)) {
      backendAvailable = true;
      const saved = (await res.json()) as DashboardConfig;
      writeLocal(saved);
      return saved;
    }
    // Endpoint exists but rejected, or isn't a real backend.
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Invalid config");
    }
    backendAvailable = false;
    return config;
  } catch (err) {
    // Network failure / no backend: localStorage already holds the change.
    if (err instanceof Error && err.message === "Invalid config") throw err;
    backendAvailable = false;
    return config;
  }
}
