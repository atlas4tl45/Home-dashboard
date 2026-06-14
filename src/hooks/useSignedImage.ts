import { useCallback, useEffect, useState } from "react";
import { normalizeUrl, signPath } from "@/api/ha";
import { useStore } from "@/store/useStore";

interface Options {
  /** Re-sign on an interval (e.g. camera snapshots). */
  refreshMs?: number;
  /** Append a cache-buster so the browser fetches a fresh frame. */
  cacheBust?: boolean;
}

/**
 * Turn a Home Assistant image path (camera_proxy, entity_picture, …) into a
 * browser-loadable URL by signing it. Absolute http(s) URLs pass through.
 */
export function useSignedImage(path: string | undefined, opts: Options = {}) {
  const creds = useStore((s) => s.creds);
  const base = creds ? normalizeUrl(creds.url) : "";
  const { refreshMs, cacheBust } = opts;

  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!path) {
      setSrc(null);
      return;
    }
    if (/^https?:\/\//.test(path)) {
      setSrc(path);
      return;
    }
    try {
      const signed = await signPath(path, 300);
      const bust = cacheBust
        ? `${signed.includes("?") ? "&" : "?"}_=${Date.now()}`
        : "";
      setSrc(`${base}${signed}${bust}`);
      setError(false);
    } catch {
      setError(true);
    }
  }, [path, base, cacheBust]);

  useEffect(() => {
    load();
    if (!refreshMs) return;
    const t = window.setInterval(load, refreshMs);
    return () => window.clearInterval(t);
  }, [load, refreshMs]);

  return { src, error, refresh: load };
}
