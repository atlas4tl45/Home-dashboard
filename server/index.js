// Minimal Express backend for the Home Dashboard.
//
// Responsibilities are intentionally tiny:
//   1. Serve the built frontend (dist/) in production.
//   2. Persist dashboard config (rooms, entity selections, theme) as a JSON
//      file so it syncs across every device that loads the dashboard.
//
// This server NEVER sees your Home Assistant URL or long-lived token — the
// browser talks to Home Assistant directly over WebSocket. Keep it that way.

import express from "express";
import compression from "compression";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const DIST_DIR = path.join(ROOT, "dist");

const PORT = process.env.PORT || 3001;

/** The shape we hand to a brand-new dashboard. */
const DEFAULT_CONFIG = {
  version: 1,
  theme: "system", // "light" | "dark" | "system"
  rooms: [
    // Example starter room; the user edits these through the UI.
    { id: "living-room", name: "Living Room", icon: "sofa", entities: [] },
  ],
};

async function ensureConfig() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      "utf8",
    );
  }
}

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function writeConfig(config) {
  // Atomic write: write to a temp file then rename so a crash mid-write can't
  // corrupt the live config.
  const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(config, null, 2), "utf8");
  await fs.rename(tmp, CONFIG_PATH);
}

/** Lightweight runtime validation so a bad PUT can't wreck the store. */
function validateConfig(body) {
  if (typeof body !== "object" || body === null) return "config must be an object";
  if (!Array.isArray(body.rooms)) return "config.rooms must be an array";
  for (const room of body.rooms) {
    if (typeof room?.id !== "string" || !room.id) return "every room needs an id";
    if (typeof room?.name !== "string") return "every room needs a name";
    if (!Array.isArray(room.entities)) return "room.entities must be an array";
  }
  if (body.theme && !["light", "dark", "system"].includes(body.theme)) {
    return "theme must be light, dark or system";
  }
  return null;
}

const app = express();
app.use(compression());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/config", async (_req, res) => {
  const config = await readConfig();
  res.json(config);
});

app.put("/api/config", async (req, res) => {
  const error = validateConfig(req.body);
  if (error) return res.status(400).json({ error });

  const next = {
    version: 1,
    theme: req.body.theme ?? "system",
    weatherEntity:
      typeof req.body.weatherEntity === "string" ? req.body.weatherEntity : undefined,
    rooms: req.body.rooms.map((r) => ({
      id: r.id,
      name: r.name ?? "Room",
      icon: r.icon ?? "home",
      entities: Array.isArray(r.entities) ? r.entities : [],
    })),
  };
  await writeConfig(next);
  res.json(next);
});

// Serve the built SPA in production. In dev, Vite serves the client and proxies
// /api here, so this block is simply inert when dist/ doesn't exist.
app.use(express.static(DIST_DIR));
app.get("*", async (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  try {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  } catch {
    next();
  }
});

await ensureConfig();
app.listen(PORT, () => {
  console.log(`[home-dashboard] config API + static server on :${PORT}`);
});
