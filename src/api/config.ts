// Client for the backend config API (rooms / entities / theme).

import type { DashboardConfig } from "@/types";

const BASE = "/api/config";

export async function fetchConfig(): Promise<DashboardConfig> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(`Failed to load config (${res.status})`);
  return res.json();
}

export async function saveConfig(
  config: DashboardConfig,
): Promise<DashboardConfig> {
  const res = await fetch(BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to save config (${res.status})`);
  }
  return res.json();
}
