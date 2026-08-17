import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeUrl, signPath } from "@/lib/ha";
import { useStore } from "@/store/store";

/**
 * Live camera still for an entity: signs the camera_proxy path and refreshes
 * it on an interval. Signed URLs are cached between refreshes; only the
 * cache-buster changes, so we don't hammer the sign endpoint.
 */
export function useCameraImage(entityId: string, refreshMs = 4000) {
  const creds = useStore((s) => s.creds);
  const base = creds ? normalizeUrl(creds.url) : "";
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const signed = useRef<{ path: string; at: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      // Re-sign every 4 minutes (URLs are valid for 5).
      if (!signed.current || Date.now() - signed.current.at > 240_000) {
        const path = await signPath(`/api/camera_proxy/${entityId}`, 300);
        signed.current = { path, at: Date.now() };
      }
      const sep = signed.current.path.includes("?") ? "&" : "?";
      setSrc(`${base}${signed.current.path}${sep}_=${Date.now()}`);
      setError(false);
    } catch {
      setError(true);
    }
  }, [entityId, base]);

  useEffect(() => {
    signed.current = null;
    refresh();
    const t = window.setInterval(refresh, refreshMs);
    return () => window.clearInterval(t);
  }, [refresh, refreshMs]);

  return { src, error };
}
