# Home

A wall-mounted [Home Assistant](https://www.home-assistant.io/) dashboard for
iPads (iPad mini through 13″), with a clean, modern glass aesthetic — frosted
panels over a soft ambient glow, big touch targets, and interactions anyone in
the house can figure out at a glance.

## What it does

- **Rooms, your way.** The dashboard reads your Home Assistant areas and
  builds a room grid on its own — and if you don't use areas, create rooms
  and assign devices right on the tablet (Settings → Rooms). No YAML, no
  card editors.
- **Set up once.** Rooms and device visibility are saved to your Home
  Assistant profile (frontend user data), so kiosk reloads, cleared browser
  storage, and brand-new tablets recover the same setup on connect.
- **Lights & fans.** Tap a tile to toggle; drag across it to dim or set speed
  (the tile fills like iOS Control Center). Long-press a color bulb for white
  tones and colors.
- **Switches & covers.** Tap to toggle, drag to set shade position.
- **Climate.** Current temperature, big +/− target steppers, mode chips.
- **Locks.** One tap to lock; press-and-hold to unlock, so a stray brush of
  the wall tablet never opens the house.
- **Alarm.** Arm Home / Away / Night and disarm, with a glass keypad when your
  panel requires a code.
- **Cameras.** Live stills for every camera, tap for full screen.
- **Security at a glance.** Door and window sensors, with open ones surfaced.
- **Home screen.** Time, date, weather, alarm state, one-tap scenes, and every
  room with its temperature and lights-on count.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL from the tablet, enter your Home Assistant address and a
long-lived access token (HA → Profile → Security → Long-lived access tokens),
and you're done.

### Production

```bash
npm run build       # static site in dist/
```

`dist/` is a fully static SPA — host it anywhere (Cloudflare Pages, Netlify,
nginx, or Home Assistant's own `www/` folder). The browser talks to Home
Assistant directly over its WebSocket API.

If the dashboard is served from a different origin than Home Assistant over
**https**, HA must also be reachable over https (browsers block mixed
content), and you may need to allow the origin in `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - https://your-dashboard.example
```

## Keeping it updated

The tablet checks for new builds on its own — on load, on wake, and every 15
minutes — and reloads while the screen is idle. It reads those builds from
wherever it's hosted, so all that's left is getting new files onto the host:

- **Served from Home Assistant?** Set up the pull-from-GitHub updater in
  [`homeassistant/`](homeassistant/README.md) and the whole loop is
  hands-off.
- **Served from a static host?** Point it at the repo and every push
  deploys; the tablet picks it up on its own.

Settings → Dashboard version shows the running build and offers **Update
now**, which asks Home Assistant to fetch the latest release and then loads
it — updating the wall panel from the wall panel.

> Home Assistant serves `/local/` with month-long cache headers, so a
> replaced `index.html` can otherwise linger on a tablet. The self-updater
> reloads through a fresh URL to sidestep that.

## Wall-tablet setup (iPad)

1. Open the dashboard in Safari → Share → **Add to Home Screen** for a
   full-screen app with no browser chrome.
2. Kiosk launchers can auto-connect by opening
   `https://your-dashboard/?url=<ha-address>&token=<token>` — credentials are
   stored on-device and stripped from the address bar.
3. Use **Guided Access** (Settings → Accessibility) to pin the app.
4. Settings → Display & Brightness → **Auto-Lock: Never** while charging.

## Stack

React 18 + TypeScript + Vite + Tailwind, `home-assistant-js-websocket` for
live state, Zustand for app state. No backend, no database, no config files.
