// Global app state: connection lifecycle, live entities, rooms, navigation.

import { create } from "zustand";
import type { HassEntities } from "home-assistant-js-websocket";
import * as ha from "@/lib/ha";
import type { Registry } from "@/lib/ha";
import { applyDemoService, demoEntities, demoRegistry } from "@/lib/demo";
import type { ConnectionStatus, Credentials, Theme, View } from "@/lib/types";

const CREDS_KEY = "glasshome.credentials";
const HIDDEN_KEY = "glasshome.hiddenAreas";
// Stored as a raw string (not JSON) — index.html reads it before first paint.
const THEME_KEY = "glasshome.theme";

function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw === "light" || raw === "dark" ? raw : "auto";
  } catch {
    return "auto";
  }
}

/** Toggle the `dark` class on <html> and keep the browser chrome in sync. */
function applyTheme(theme: Theme): void {
  const dark =
    theme === "dark" ||
    (theme === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#0b0e15" : "#f0f1f3");
}

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/blocked — non-fatal */
  }
}

/**
 * Kiosk launchers can pass credentials in the URL
 * (…/?url=http://ha.local:8123&token=…). They're stored then stripped from
 * the address bar so the token never lingers on screen.
 */
function credsFromLaunchUrl(): Credentials | null {
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url");
  const token = params.get("token");
  if (!url || !token) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return { url, token };
}

interface AppState {
  creds: Credentials | null;
  status: ConnectionStatus;
  error: string | null;
  entities: HassEntities;
  registry: Registry | null;
  view: View;
  hiddenAreas: string[];
  theme: Theme;

  connect: (creds: Credentials) => Promise<void>;
  reconnect: () => Promise<void>;
  signOut: () => void;
  navigate: (view: View) => void;
  toggleAreaHidden: (areaId: string) => void;
  setTheme: (theme: Theme) => void;
}

let unsubscribeStates: (() => void) | null = null;

/** `?demo` shows a sample home without a Home Assistant instance. */
const isDemo = new URLSearchParams(window.location.search).has("demo");

export const useStore = create<AppState>((set, get) => ({
  creds: isDemo
    ? { url: "demo.home", token: "demo" }
    : (credsFromLaunchUrl() ?? loadJson<Credentials>(CREDS_KEY)),
  status: isDemo ? "connected" : "idle",
  error: null,
  entities: isDemo ? demoEntities : {},
  registry: isDemo ? demoRegistry : null,
  view: { name: "home" },
  hiddenAreas: loadJson<string[]>(HIDDEN_KEY) ?? [],
  theme: loadTheme(),

  async connect(creds) {
    if (isDemo) return;
    set({ status: "connecting", error: null });
    try {
      const conn = await ha.connect(creds);
      const registry = await ha.fetchRegistry(conn);
      unsubscribeStates?.();
      unsubscribeStates = ha.subscribeStates(conn, (entities) =>
        set({ entities }),
      );
      // Registries change rarely; refresh them whenever the socket recovers.
      conn.addEventListener("ready", () => {
        ha.fetchRegistry(conn)
          .then((r) => set({ registry: r }))
          .catch(() => {});
      });
      saveJson(CREDS_KEY, creds);
      set({ creds, registry, status: "connected" });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Connection failed.",
      });
      throw err;
    }
  },

  async reconnect() {
    const { creds } = get();
    if (creds) await get().connect(creds);
  },

  signOut() {
    if (isDemo) {
      window.location.href = window.location.pathname;
      return;
    }
    unsubscribeStates?.();
    unsubscribeStates = null;
    ha.disconnect();
    localStorage.removeItem(CREDS_KEY);
    set({
      creds: null,
      status: "idle",
      error: null,
      entities: {},
      registry: null,
      view: { name: "home" },
    });
  },

  navigate(view) {
    set({ view });
  },

  toggleAreaHidden(areaId) {
    const hidden = get().hiddenAreas;
    const next = hidden.includes(areaId)
      ? hidden.filter((id) => id !== areaId)
      : [...hidden, areaId];
    saveJson(HIDDEN_KEY, next);
    set({ hiddenAreas: next });
  },

  setTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* non-fatal */
    }
    set({ theme });
    applyTheme(theme);
  },
}));

applyTheme(useStore.getState().theme);
// In auto mode, follow the tablet's appearance as it changes.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => applyTheme(useStore.getState().theme));

if (isDemo) {
  ha.setDemoHandler((domain, service, data, entityId) => {
    useStore.setState((s) => ({
      entities: applyDemoService(s.entities, domain, service, data, entityId),
    }));
  });
}
