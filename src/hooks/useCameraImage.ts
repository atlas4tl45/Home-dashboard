import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeUrl, signPath } from "@/lib/ha";
import { isUnavailable } from "@/lib/entities";
import { useStore } from "@/store/store";

/**
 * Live still image for a camera.
 *
 * Home Assistant publishes an `entity_picture` for each camera — the
 * camera_proxy path with a rotating access token — which is what the HA
 * frontend itself renders. We use that, and fall back to signing the proxy
 * path for cameras that don't expose one.
 *
 * Note the cache-buster has to be part of the path we sign: Home Assistant
 * signs the query string as well as the path, so appending anything to a
 * signed URL afterwards invalidates the signature and the request 401s.
 */
export function useCameraImage(entityId: string, refreshMs = 4000) {
  const creds = useStore((s) => s.creds);
  const entity = useStore((s) => s.entities[entityId]);
  const base = creds ? normalizeUrl(creds.url) : "";
  const entityPicture = entity?.attributes.entity_picture as string | undefined;
  const unavailable = entity ? isUnavailable(entity) : true;

  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (unavailable) {
      setSrc(null);
      return;
    }
    const bust = `_=${Date.now()}`;
    if (entityPicture) {
      const sep = entityPicture.includes("?") ? "&" : "?";
      setSrc(`${base}${entityPicture}${sep}${bust}`);
      setError(false);
      return;
    }
    const mine = ++generation.current;
    try {
      const path = await signPath(`/api/camera_proxy/${entityId}?${bust}`, 300);
      if (mine !== generation.current) return; // a newer refresh won
      setSrc(`${base}${path}`);
      setError(false);
    } catch {
      setError(true);
    }
  }, [unavailable, entityPicture, base, entityId]);

  useEffect(() => {
    if (!refreshMs) return; // paused (e.g. a live stream is playing instead)
    void refresh();
    const timer = window.setInterval(() => void refresh(), refreshMs);
    return () => window.clearInterval(timer);
  }, [refresh, refreshMs]);

  /** The browser couldn't load the frame — surface it and try again. */
  const handleImageError = useCallback(() => {
    setError(true);
    void refresh();
  }, [refresh]);

  return { src, error, unavailable, handleImageError, refresh };
}
