import { create } from "zustand";
import type {
  ConnectionStatus,
  DashboardConfig,
  HaCredentials,
  HassEntity,
  Room,
  RoomEntity,
  Theme,
} from "@/types";
import * as ha from "@/api/ha";
import { fetchConfig, saveConfig } from "@/api/config";

const CREDS_KEY = "hd.creds";
const THEME_KEY = "hd.theme";

function loadCreds(): HaCredentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as HaCredentials) : null;
  } catch {
    return null;
  }
}

function persistCreds(creds: HaCredentials | null) {
  if (creds) localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  else localStorage.removeItem(CREDS_KEY);
}

/**
 * Read HA credentials from the launch URL so a kiosk can auto-connect even if
 * localStorage was wiped. Use the hash fragment (preferred, never sent to a
 * server) or query string:
 *   https://dash.example/#ha_url=http://homeassistant.local:8123&token=XXXX
 */
function credsFromUrl(): HaCredentials | null {
  try {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash || window.location.search.replace(/^\?/, ""));
    const url = params.get("ha_url") || params.get("ha");
    const token = params.get("token");
    if (url && token) return { url, token };
  } catch {
    /* ignore */
  }
  return null;
}

/** Resolve "system" to an effective light/dark and apply it to <html>. */
function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem(THEME_KEY, theme);
}

interface StoreState {
  // connection
  creds: HaCredentials | null;
  status: ConnectionStatus;
  connectionError: string | null;
  entities: Record<string, HassEntity>;

  // config
  config: DashboardConfig | null;
  configLoading: boolean;
  saving: boolean;

  // bootstrap
  bootstrap: () => Promise<void>;
  connect: (creds: HaCredentials) => Promise<void>;
  logout: () => void;

  // theme
  setTheme: (theme: Theme) => void;
  setWeatherEntity: (entityId: string | undefined) => Promise<void>;

  // config mutations (optimistic + persisted)
  updateConfig: (mutate: (draft: DashboardConfig) => void) => Promise<void>;
  addRoom: (name: string, icon?: string) => Promise<void>;
  updateRoom: (id: string, patch: Partial<Omit<Room, "id">>) => Promise<void>;
  removeRoom: (id: string) => Promise<void>;
  reorderRooms: (ids: string[]) => Promise<void>;
  addEntityToRoom: (roomId: string, entity: RoomEntity) => Promise<void>;
  removeEntityFromRoom: (roomId: string, entityId: string) => Promise<void>;
}

let unsubscribeEntities: (() => void) | null = null;

export const useStore = create<StoreState>((set, get) => ({
  creds: loadCreds(),
  status: "idle",
  connectionError: null,
  entities: {},

  config: null,
  configLoading: true,
  saving: false,

  async bootstrap() {
    // 1. Load dashboard config from the backend.
    set({ configLoading: true });
    try {
      const config = await fetchConfig();
      set({ config });
      applyTheme(config.theme ?? "system");
    } catch {
      // Fall back to a usable empty config if the backend is unreachable.
      set({
        config: { version: 1, theme: "system", rooms: [] },
      });
    } finally {
      set({ configLoading: false });
    }

    // 2. Connect to Home Assistant. Credentials embedded in the launch URL
    //    (e.g. a kiosk's start URL) take priority and survive localStorage
    //    being cleared on app quit. The fragment is never sent to a server.
    const urlCreds = credsFromUrl();
    const creds = urlCreds ?? get().creds;
    if (urlCreds) {
      // Remove the token from the address bar / history once consumed.
      try {
        history.replaceState(null, "", window.location.pathname);
      } catch {
        /* ignore */
      }
    }
    if (creds) {
      await get().connect(creds);
    }
  },

  async connect(creds) {
    set({ status: "connecting", connectionError: null });
    try {
      const conn = await ha.connect(creds);

      if (unsubscribeEntities) unsubscribeEntities();
      unsubscribeEntities = ha.subscribe(conn, (entities) => {
        set({ entities });
      });

      ha.reconnectListeners.onDisconnect(conn, () =>
        set({ status: "disconnected" }),
      );
      ha.reconnectListeners.onReconnect(conn, () =>
        set({ status: "connected", connectionError: null }),
      );

      persistCreds(creds);
      set({ creds, status: "connected" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect.";
      set({ status: "error", connectionError: message });
      throw err;
    }
  },

  logout() {
    if (unsubscribeEntities) {
      unsubscribeEntities();
      unsubscribeEntities = null;
    }
    ha.disconnect();
    persistCreds(null);
    set({ creds: null, status: "idle", entities: {}, connectionError: null });
  },

  setTheme(theme) {
    applyTheme(theme);
    void get().updateConfig((draft) => {
      draft.theme = theme;
    });
  },

  async setWeatherEntity(entityId) {
    await get().updateConfig((draft) => {
      draft.weatherEntity = entityId;
    });
  },

  async updateConfig(mutate) {
    const current = get().config;
    if (!current) return;
    // Deep-clone so we never mutate the live state object in place.
    const draft: DashboardConfig = JSON.parse(JSON.stringify(current));
    mutate(draft);

    const previous = current;
    set({ config: draft, saving: true });
    try {
      const saved = await saveConfig(draft);
      set({ config: saved });
    } catch (err) {
      // Roll back optimistic update on failure.
      set({ config: previous });
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  async addRoom(name, icon = "home") {
    const id = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    await get().updateConfig((draft) => {
      draft.rooms.push({ id, name, icon, entities: [] });
    });
  },

  async updateRoom(id, patch) {
    await get().updateConfig((draft) => {
      const room = draft.rooms.find((r) => r.id === id);
      if (room) Object.assign(room, patch);
    });
  },

  async removeRoom(id) {
    await get().updateConfig((draft) => {
      draft.rooms = draft.rooms.filter((r) => r.id !== id);
    });
  },

  async reorderRooms(ids) {
    await get().updateConfig((draft) => {
      draft.rooms.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    });
  },

  async addEntityToRoom(roomId, entity) {
    await get().updateConfig((draft) => {
      const room = draft.rooms.find((r) => r.id === roomId);
      if (room && !room.entities.some((e) => e.entity_id === entity.entity_id)) {
        room.entities.push(entity);
      }
    });
  },

  async removeEntityFromRoom(roomId, entityId) {
    await get().updateConfig((draft) => {
      const room = draft.rooms.find((r) => r.id === roomId);
      if (room) {
        room.entities = room.entities.filter((e) => e.entity_id !== entityId);
      }
    });
  },
}));

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "room"
  );
}
