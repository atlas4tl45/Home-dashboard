// Global app state: connection lifecycle, live entities, rooms, navigation.

import { create } from "zustand";
import type { HassEntities } from "home-assistant-js-websocket";
import * as ha from "@/lib/ha";
import type { Registry } from "@/lib/ha";
import { applyDemoService, demoEntities, demoRegistry } from "@/lib/demo";
import type {
  ConnectionStatus,
  Credentials,
  CustomRoom,
  FeatureSelections,
  TabletConfig,
  Theme,
  View,
} from "@/lib/types";

const CREDS_KEY = "glasshome.credentials";
const HIDDEN_KEY = "glasshome.hiddenAreas";
const HIDDEN_ENTITIES_KEY = "glasshome.hiddenEntities";
const ROOMS_KEY = "glasshome.customRooms";
const FEATURES_KEY = "glasshome.features";

export const isCustomRoomId = (id: string): boolean => id.startsWith("room:");
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
  /** Entities hidden on this tablet only (HA's own hidden flag also applies). */
  hiddenEntities: string[];
  /** Rooms created on this tablet; assignments override Home Assistant areas. */
  customRooms: CustomRoom[];
  /** Which entity powers each whole-home feature (alarm, weather, ...). */
  features: FeatureSelections;
  theme: Theme;

  connect: (creds: Credentials) => Promise<void>;
  reconnect: () => Promise<void>;
  signOut: () => void;
  navigate: (view: View) => void;
  toggleAreaHidden: (areaId: string) => void;
  toggleEntityHidden: (entityId: string) => void;
  addRoom: (name: string) => string;
  renameRoom: (roomId: string, name: string) => void;
  deleteRoom: (roomId: string) => void;
  toggleRoomEntity: (roomId: string, entityId: string) => void;
  setFeature: (
    feature: keyof FeatureSelections,
    selection: string | null,
  ) => void;
  setTheme: (theme: Theme) => void;
}

let unsubscribeStates: (() => void) | null = null;

/**
 * `?demo` shows a sample home without a Home Assistant instance. Embeds that
 * can't carry a query string (e.g. a hosted preview) set `window.__DEMO__`
 * before the bundle loads instead.
 */
const isDemo =
  new URLSearchParams(window.location.search).has("demo") ||
  (window as { __DEMO__?: boolean }).__DEMO__ === true;

// ---------------------------------------------------------------------------
// Setup sync. The room/device setup is stored in the Home Assistant user
// profile (frontend user data), with localStorage as an instant-boot cache —
// so a kiosk that loses browser storage recovers its layout on connect.

const HA_CONFIG_KEY = "glasshome_config";

let pushTimer: number | undefined;
let pushPending = false;

/** Persist the current setup to the HA profile (debounced, last-writer-wins). */
function schedulePushConfig(): void {
  if (isDemo) return;
  pushPending = true;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    const { status, customRooms, hiddenAreas, hiddenEntities, features } =
      useStore.getState();
    if (status !== "connected") return; // cached locally; seeded on next connect
    const config: TabletConfig = {
      customRooms,
      hiddenAreas,
      hiddenEntities,
      features,
    };
    ha.setUserData(HA_CONFIG_KEY, config)
      .then(() => {
        pushPending = false;
      })
      .catch(() => {
        /* stays pending; retried on the next edit or reconnect */
      });
  }, 800);
}

function cacheConfigLocally(config: TabletConfig): void {
  saveJson(ROOMS_KEY, config.customRooms);
  saveJson(HIDDEN_KEY, config.hiddenAreas);
  saveJson(HIDDEN_ENTITIES_KEY, config.hiddenEntities);
  saveJson(FEATURES_KEY, config.features);
}

/** Adopt the server copy of the setup; if the server has none, seed it from here. */
async function syncConfigFromServer(): Promise<void> {
  if (isDemo) return;
  if (pushPending) {
    // Local edits haven't landed yet — push them rather than clobbering them.
    schedulePushConfig();
    return;
  }
  try {
    const remote = await ha.getUserData<Partial<TabletConfig>>(HA_CONFIG_KEY);
    if (remote) {
      const config: TabletConfig = {
        customRooms: remote.customRooms ?? [],
        hiddenAreas: remote.hiddenAreas ?? [],
        hiddenEntities: remote.hiddenEntities ?? [],
        features: remote.features ?? {},
      };
      cacheConfigLocally(config);
      useStore.setState(config);
    } else {
      const { customRooms, hiddenAreas, hiddenEntities, features } =
        useStore.getState();
      if (
        customRooms.length ||
        hiddenAreas.length ||
        hiddenEntities.length ||
        Object.keys(features).length
      ) {
        schedulePushConfig(); // first connect from this tablet seeds the profile
      }
    }
  } catch {
    /* older HA or transient error — keep the local cache */
  }
}

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
  hiddenEntities: loadJson<string[]>(HIDDEN_ENTITIES_KEY) ?? [],
  customRooms: loadJson<CustomRoom[]>(ROOMS_KEY) ?? [],
  features: loadJson<FeatureSelections>(FEATURES_KEY) ?? {},
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
      // Registries change rarely; refresh them (and re-sync the saved setup)
      // whenever the socket recovers.
      conn.addEventListener("ready", () => {
        ha.fetchRegistry(conn)
          .then((r) => set({ registry: r }))
          .catch(() => {});
        void syncConfigFromServer();
      });
      saveJson(CREDS_KEY, creds);
      set({ creds, registry, status: "connected" });
      await syncConfigFromServer();
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
    window.clearTimeout(pushTimer);
    pushPending = false;
    localStorage.removeItem(CREDS_KEY);
    localStorage.removeItem(ROOMS_KEY);
    localStorage.removeItem(HIDDEN_KEY);
    localStorage.removeItem(HIDDEN_ENTITIES_KEY);
    localStorage.removeItem(FEATURES_KEY);
    set({
      creds: null,
      status: "idle",
      error: null,
      entities: {},
      registry: null,
      view: { name: "home" },
      customRooms: [],
      hiddenAreas: [],
      hiddenEntities: [],
      features: {},
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
    schedulePushConfig();
  },

  toggleEntityHidden(entityId) {
    const hidden = get().hiddenEntities;
    const next = hidden.includes(entityId)
      ? hidden.filter((id) => id !== entityId)
      : [...hidden, entityId];
    saveJson(HIDDEN_ENTITIES_KEY, next);
    set({ hiddenEntities: next });
    schedulePushConfig();
  },

  addRoom(name) {
    const id = `room:${Date.now().toString(36)}`;
    const next = [...get().customRooms, { id, name, entityIds: [] }];
    saveJson(ROOMS_KEY, next);
    set({ customRooms: next });
    schedulePushConfig();
    return id;
  },

  renameRoom(roomId, name) {
    const next = get().customRooms.map((r) =>
      r.id === roomId ? { ...r, name } : r,
    );
    saveJson(ROOMS_KEY, next);
    set({ customRooms: next });
    schedulePushConfig();
  },

  deleteRoom(roomId) {
    const next = get().customRooms.filter((r) => r.id !== roomId);
    saveJson(ROOMS_KEY, next);
    const hiddenAreas = get().hiddenAreas.filter((id) => id !== roomId);
    saveJson(HIDDEN_KEY, hiddenAreas);
    set({ customRooms: next, hiddenAreas });
    schedulePushConfig();
  },

  toggleRoomEntity(roomId, entityId) {
    const inRoom = get()
      .customRooms.find((r) => r.id === roomId)
      ?.entityIds.includes(entityId);
    // An entity lives in at most one room, so assigning moves it.
    const next = get().customRooms.map((r) => {
      if (r.id === roomId) {
        return {
          ...r,
          entityIds: inRoom
            ? r.entityIds.filter((id) => id !== entityId)
            : [...r.entityIds, entityId],
        };
      }
      return r.entityIds.includes(entityId)
        ? { ...r, entityIds: r.entityIds.filter((id) => id !== entityId) }
        : r;
    });
    saveJson(ROOMS_KEY, next);
    set({ customRooms: next });
    schedulePushConfig();
  },

  setFeature(feature, selection) {
    const features = { ...get().features };
    if (selection === null) delete features[feature];
    else features[feature] = selection;
    saveJson(FEATURES_KEY, features);
    set({ features });
    schedulePushConfig();
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
