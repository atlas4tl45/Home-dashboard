// Cloudflare Pages Function for dashboard config (rooms / entities / theme).
//
// Handles GET/PUT /api/config and stores the config in a Cloudflare KV
// namespace so it syncs across every device — all on the free Pages tier, no
// separate server to host.
//
// Setup (one-time, in the Cloudflare dashboard):
//   1. Workers & Pages -> KV -> Create a namespace (e.g. "home-dashboard").
//   2. Your Pages project -> Settings -> Functions -> KV namespace bindings
//      -> add binding with Variable name `DASHBOARD_KV` pointing at it.
//      (See wrangler.toml for the local/CI binding too.)
//
// If the binding is missing, this returns 503 and the frontend transparently
// falls back to per-device localStorage, so the app keeps working either way.

const KEY = "config";

const DEFAULT_CONFIG = {
  version: 1,
  theme: "system",
  rooms: [
    { id: "living-room", name: "Living Room", icon: "sofa", entities: [] },
  ],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

/** Mirror of the Express backend's validation so both stay consistent. */
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

export async function onRequestGet(context) {
  const kv = context.env.DASHBOARD_KV;
  if (!kv) return json({ error: "KV namespace 'DASHBOARD_KV' not bound" }, 503);

  const stored = await kv.get(KEY, "json");
  return json(stored ?? DEFAULT_CONFIG);
}

export async function onRequestPut(context) {
  const kv = context.env.DASHBOARD_KV;
  if (!kv) return json({ error: "KV namespace 'DASHBOARD_KV' not bound" }, 503);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  const error = validateConfig(body);
  if (error) return json({ error }, 400);

  const next = {
    version: 1,
    theme: body.theme ?? "system",
    accent: typeof body.accent === "string" ? body.accent : undefined,
    weatherEntity:
      typeof body.weatherEntity === "string" ? body.weatherEntity : undefined,
    rooms: body.rooms.map((r) => ({
      id: r.id,
      name: r.name ?? "Room",
      icon: r.icon ?? "home",
      entities: Array.isArray(r.entities) ? r.entities : [],
    })),
  };

  await kv.put(KEY, JSON.stringify(next));
  return json(next);
}
