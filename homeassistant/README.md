# Hands-off updates

Home Assistant serves the dashboard from `config/www/dashboard/`, so keeping
it current is two hops:

1. **Home Assistant pulls the newest build from GitHub** — the piece set up
   below.
2. **The tablet notices and reloads itself** — already built in. It checks
   `version.json` on load, on wake, and every 15 minutes, then reloads while
   the screen is idle.

Together: push code, and the wall tablet is running it within a few hours,
untouched — or immediately, via **Update now** in Settings.

## Setup (once)

**1. Put the updater somewhere an update can't delete it.** Copy
`update.py` (from the dashboard folder you already installed) to
`/config/glasshome_update.py` — over Samba, the File Editor add-on, or SSH.

Keeping it outside `config/www/dashboard/` matters: that whole folder gets
replaced on every update, so an updater living inside it would delete itself
if a build ever left it out.

**2. Add the command to `configuration.yaml`:**

```yaml
shell_command:
  glasshome_update: "python3 /config/glasshome_update.py /config/www/dashboard"
```

Restart Home Assistant (Settings → System → Restart).

**3. Test it from the tablet.** Settings → Dashboard version → **Update
now**. That button calls this same `shell_command`, waits for it, then loads
the new build — so once step 2 is done you can update from the wall, no
computer involved. (Developer Tools → Actions →
`shell_command.glasshome_update` works too; `returncode: 0` means success.)

The button keeps the service name `glasshome_update`, so name it exactly
that.

**4. Schedule it.** Settings → Automations → Create automation → three-dot
menu → *Edit in YAML*, then paste:

```yaml
alias: Update wall dashboard
description: Pull the latest dashboard build from GitHub
trigger:
  - platform: time_pattern
    hours: "/6"
  - platform: homeassistant
    event: start
condition: []
action:
  - service: shell_command.glasshome_update
mode: single
```

Every six hours, and on restart. Adjust to taste — nightly is plenty:

```yaml
trigger:
  - platform: time
    at: "04:00:00"
```

## What it does

- Downloads `dashboard.zip` from the `dashboard-latest` release
- Extracts to a staging folder first and verifies it contains `index.html`
- Compares `version.json` and does nothing if the build is unchanged
- Only then swaps the folder, so a failed download never breaks the
  dashboard that's already working

## Private repository

Put a GitHub token with `contents: read` in `/config/glasshome_token.txt`
(or set `GLASSHOME_GITHUB_TOKEN`) and the updater authenticates against the
releases API instead of the public download URL.

## Pointing at a different repo

Environment variables `GLASSHOME_OWNER`, `GLASSHOME_REPO`, and
`GLASSHOME_TAG` override the defaults if you fork it.
