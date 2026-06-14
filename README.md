# Home Dashboard

A sleek, modern dashboard for your **Home Assistant** instance — control
lighting, climate, locks, cameras and your alarm system from clean per-room
views, with a built-in UI for adding/removing entities and dark/light themes.

![status](https://img.shields.io/badge/status-alpha-blue)

## Features

- **Per-room views** — organise entities into rooms with custom names & icons.
- **First-class controls** for the things that matter:
  - 💡 **Lights** — on/off + brightness
  - 🔌 **Switches / Fans** — on/off + fan speed
  - 🌡️ **Climate** — setpoint and HVAC mode
  - 🔒 **Locks** — lock / unlock with live state
  - 📷 **Cameras** — auto-refreshing snapshots
  - 🛡️ **Alarm panel** — arm (home/away/night) & disarm, with code support
  - 🪟 **Covers**, plus read-only **sensors / binary sensors**
- **Entity manager** — search every entity in Home Assistant and add/remove it
  from a room in a couple of taps.
- **Dark / light / system** theme, applied before first paint (no flash).
- **Config syncs across devices** — rooms, layout and theme are stored
  server-side as JSON, so your phone and desktop stay in sync.
- **Responsive** — works as a wall tablet, phone, or desktop dashboard.

## Architecture

```
┌─────────────┐   WebSocket (long-lived token)   ┌────────────────┐
│   Browser   │ ───────────────────────────────► │ Home Assistant │
│  (React)    │ ◄─── live entity state ───────── │                │
└──────┬──────┘                                   └────────────────┘
       │  GET/PUT /api/config (rooms, theme)
       ▼
┌─────────────┐
│  Express    │  stores dashboard layout as JSON
│  backend    │  (server/data/config.json)
└─────────────┘
```

- The **browser talks to Home Assistant directly** over the official
  [`home-assistant-js-websocket`](https://github.com/home-assistant/home-assistant-js-websocket)
  client, authenticating with a long-lived access token kept in your browser.
- The **Express backend never sees your Home Assistant URL or token.** It only
  stores dashboard config (rooms / entities / theme) so it can sync across
  devices.

**Stack:** React + Vite + TypeScript, Tailwind CSS, Zustand, Express.

## Getting started

### Prerequisites

- Node.js 20+
- A Home Assistant instance reachable from the device running the dashboard
- A **long-lived access token**: in Home Assistant go to your profile →
  *Security* → *Long-lived access tokens* → *Create token*.

### Develop

```bash
npm install
npm run dev
```

This starts the Vite dev server on **http://localhost:5173** and the config API
on **http://localhost:3001** (Vite proxies `/api` to it). Open the app, paste
your Home Assistant URL and token, and you're connected.

### Production build

```bash
npm run build   # outputs static assets to dist/
npm start       # Express serves dist/ and the config API on :3001
```

Then open **http://localhost:3001**. Set `PORT` to change the port.

### Deploy to Cloudflare Pages (or any static host)

The dashboard runs fine as a **pure static site** — there's no backend to host.
When no `/api/config` backend is present, it stores your rooms/layout/theme in
the browser's `localStorage` instead (per-device rather than synced).

In the Cloudflare Pages project settings, use:

| Setting               | Value           |
| --------------------- | --------------- |
| **Build command**     | `npm run build` |
| **Build output dir**  | `dist`          |
| **Node version**      | `20` (or newer) |

> **White page after deploy?** It almost always means Cloudflare served the
> repository's source `index.html` (which points at `/src/main.tsx`, a dev-only
> file) instead of the built app. Make sure the **build command** and **output
> directory** above are set so Cloudflare builds `dist/` — `dist/` is
> git-ignored on purpose, so Cloudflare must build it. The included
> `public/_redirects` handles SPA deep links automatically.

If you want rooms/layout to **sync across devices**, deploy the Node server
(`npm start`) somewhere instead — e.g. a small VPS, Fly.io, or a Raspberry Pi
on your network — and point your browser at it.

## Configuration & data

- With the Node backend, dashboard layout is stored at
  `server/data/config.json` (created on first run, git-ignored). Back this file
  up to preserve your rooms/layout.
- On a static host with no backend, layout falls back to this browser's
  `localStorage` (`hd.config`) — per-device rather than synced.
- Your Home Assistant credentials live only in the browser's `localStorage`
  (`hd.creds`) and are never sent to the backend. Use **Settings → Disconnect**
  to remove them.

## Project layout

```
server/index.js          Express config API + static server
src/
  api/ha.ts              Home Assistant WebSocket wrapper
  api/config.ts          Backend config client
  store/useStore.ts      Zustand store (connection, entities, config)
  lib/                   entity + icon helpers
  components/
    cards/               one card per domain (light, climate, lock, …)
    layout/              shell, sidebar, header, theme toggle
    ui/                  modal, toggle, slider
    ConnectionSetup.tsx  onboarding
    EntityPicker.tsx     add/remove entities
  pages/                 RoomView, Settings
```

## Notes & limitations

- Camera cards show periodically-refreshed snapshots via Home Assistant's
  signed `camera_proxy` URLs (works without exposing your token in markup).
  Live HLS streaming is not yet wired up.
- The dashboard is designed for trusted local-network use. If exposing it
  publicly, put it behind your own authenticated reverse proxy.
