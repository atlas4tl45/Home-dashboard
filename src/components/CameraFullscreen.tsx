// Full-screen camera. Plays Home Assistant's HLS stream so it's actually
// live — Safari on iPad plays HLS natively, other browsers get hls.js
// loaded on demand. Cameras that can't stream fall back to refreshing
// snapshots, and say so rather than pretending to be live.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/store/store";
import { useCameraImage } from "@/hooks/useCameraImage";
import { fetchCameraStream, normalizeUrl } from "@/lib/ha";
import { friendlyName, supportsStream } from "@/lib/entities";

type Status = "starting" | "live" | "snapshots";

const START_TIMEOUT_MS = 20_000;

export function CameraFullscreen({ entityId }: { entityId: string }) {
  const entity = useStore((s) => s.entities[entityId]);
  const creds = useStore((s) => s.creds);
  const close = useStore((s) => s.setFullscreenCamera);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>(
    entity && supportsStream(entity) ? "starting" : "snapshots",
  );

  // Snapshot fallback only refreshes while it's actually on screen.
  const { src, error, handleImageError } = useCameraImage(
    entityId,
    status === "snapshots" ? 1000 : 0,
  );

  useEffect(() => {
    if (!entity || !supportsStream(entity) || !creds) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const giveUp = window.setTimeout(() => {
      if (!cancelled) setStatus("snapshots");
    }, START_TIMEOUT_MS);

    (async () => {
      const path = await fetchCameraStream(entityId);
      const element = video.current;
      if (cancelled || !path || !element) {
        if (!cancelled) setStatus("snapshots");
        return;
      }
      const url = `${normalizeUrl(creds.url)}${path}`;
      const onPlaying = () => {
        window.clearTimeout(giveUp);
        if (!cancelled) setStatus("live");
      };
      element.addEventListener("playing", onPlaying);

      if (element.canPlayType("application/vnd.apple.mpegurl")) {
        element.src = url; // Safari / iPadOS
        destroy = () => element.removeEventListener("playing", onPlaying);
      } else {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setStatus("snapshots");
          return;
        }
        const hls = new Hls({ lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(element);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !cancelled) setStatus("snapshots");
        });
        destroy = () => {
          element.removeEventListener("playing", onPlaying);
          hls.destroy();
        };
      }
      void element.play().catch(() => {
        /* autoplay blocked — the poster/snapshot still shows */
      });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      destroy?.();
    };
  }, [entityId, entity, creds]);

  if (!entity) return null;
  const showVideo = status !== "snapshots";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={() => close(null)}
    >
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        className={`max-h-full max-w-full object-contain ${showVideo ? "" : "hidden"}`}
      />
      {!showVideo &&
        (src && !error ? (
          <img
            src={src}
            alt={friendlyName(entity)}
            onError={handleImageError}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="text-white/70">
            {error ? "No signal" : "Loading…"}
          </span>
        ))}
      {status === "starting" && (
        <span className="absolute text-white/70">Starting live view…</span>
      )}
      <span className="glass-pill absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2.5 px-5 py-2.5 text-[15px] font-medium">
        {status === "live" && (
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
        )}
        {friendlyName(entity)}
        {status === "snapshots" && (
          <span className="text-[13px] text-ink/45">snapshots</span>
        )}
      </span>
      <button
        aria-label="Close"
        onClick={() => close(null)}
        className="glass-pill pressable absolute right-6 top-6 flex h-12 w-12 items-center justify-center"
      >
        <X size={22} />
      </button>
    </div>
  );
}
