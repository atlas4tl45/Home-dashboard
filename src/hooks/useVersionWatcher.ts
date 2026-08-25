// Self-updating kiosk support.
//
// Home Assistant serves /local/ files with long-lived cache headers, so a
// wall tablet will happily run a months-old index.html after you replace the
// files. This polls the build's version.json (cache-busted) and, when a new
// build is on the server, reloads through a fresh URL — which sidesteps the
// cached entry entirely. The reload waits for the tablet to be idle so it
// never yanks the screen out from under someone mid-tap.

import { useCallback, useEffect, useRef, useState } from "react";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const IDLE_BEFORE_RELOAD_MS = 30_000;
const IDLE_POLL_MS = 5000;

/** Fetch the version deployed on the server right now. */
export async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: string };
    return body.version ?? null;
  } catch {
    return null; // offline, or served somewhere without version.json
  }
}

/** Reload through a URL the cache has never seen, so we get the new build. */
export function reloadWithVersion(version: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("v", version);
  window.location.replace(url.toString());
}

export function useVersionWatcher(): { updateAvailable: string | null } {
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const lastInteraction = useRef(Date.now());

  useEffect(() => {
    const touch = () => {
      lastInteraction.current = Date.now();
    };
    window.addEventListener("pointerdown", touch, { passive: true });
    return () => window.removeEventListener("pointerdown", touch);
  }, []);

  const check = useCallback(async () => {
    const deployed = await fetchDeployedVersion();
    if (deployed && deployed !== __BUILD_ID__) setUpdateAvailable(deployed);
  }, []);

  // Poll periodically, and whenever the tablet wakes or regains focus.
  useEffect(() => {
    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  // Apply the update once nobody is using the screen.
  useEffect(() => {
    if (!updateAvailable) return;
    const timer = window.setInterval(() => {
      if (Date.now() - lastInteraction.current >= IDLE_BEFORE_RELOAD_MS) {
        reloadWithVersion(updateAvailable);
      }
    }, IDLE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [updateAvailable]);

  return { updateAvailable };
}
