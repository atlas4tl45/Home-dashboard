import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, VideoOff } from "lucide-react";
import type { CardProps } from "./types";
import { signPath, normalizeUrl } from "@/api/ha";
import { useStore } from "@/store/useStore";
import { isUnavailable } from "@/lib/entities";

const REFRESH_MS = 10_000;

export function CameraCard({ entity, name, editing, onRemove }: CardProps) {
  const creds = useStore((s) => s.creds);
  const unavailable = isUnavailable(entity);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const timer = useRef<number | null>(null);

  const entityId = entity?.entity_id;
  const base = creds ? normalizeUrl(creds.url) : "";

  const refresh = async () => {
    if (!entityId || !base) return;
    try {
      const path = await signPath(`/api/camera_proxy/${entityId}`, 60);
      // Cache-bust so the browser actually fetches a fresh frame.
      setSrc(`${base}${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`);
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    if (unavailable) return;
    refresh();
    timer.current = window.setInterval(refresh, REFRESH_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, base, unavailable]);

  return (
    <div className="card group relative col-span-2 overflow-hidden">
      {editing && onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 z-20 rounded-full bg-black/60 p-1.5 text-white hover:bg-red-500"
          aria-label={`Remove ${name}`}
        >
          ✕
        </button>
      )}
      <div className="relative aspect-video w-full bg-surface-2">
        {src && !error && !unavailable ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
            {unavailable || error ? (
              <>
                <VideoOff className="h-8 w-8" />
                <span className="text-xs">
                  {unavailable ? "Camera unavailable" : "No snapshot"}
                </span>
              </>
            ) : (
              <Camera className="h-8 w-8 animate-pulse" />
            )}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
          <span className="truncate text-sm font-medium text-white">{name}</span>
          <button
            onClick={refresh}
            className="pointer-events-auto rounded-full bg-white/20 p-1.5 text-white opacity-0 transition-opacity hover:bg-white/30 group-hover:opacity-100"
            aria-label="Refresh snapshot"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
