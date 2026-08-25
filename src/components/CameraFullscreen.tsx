// Full-screen camera.
//
// The snapshot shows immediately and keeps refreshing, so there is always a
// picture on screen. A live stream is started underneath and takes over only
// once it is actually playing — you never sit looking at a blank panel
// waiting for it, and if it can't start you still have the camera plus a
// reason why.
//
// Home Assistant needs a second or two to produce the first HLS segment, so
// the playlist is polled until it exists before handing it to the player.

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCw, X } from "lucide-react";
import { useStore } from "@/store/store";
import { useCameraImage } from "@/hooks/useCameraImage";
import { fetchCameraStream, normalizeUrl } from "@/lib/ha";
import { friendlyName, supportsStream } from "@/lib/entities";

type Status = "connecting" | "live" | "blocked" | "unavailable";

const PLAYLIST_TRIES = 15;
const PLAYLIST_INTERVAL_MS = 1000;

const sleep = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

/** Home Assistant returns the URL before the first segment exists. */
async function waitForPlaylist(url: string, aborted: () => boolean) {
  for (let attempt = 0; attempt < PLAYLIST_TRIES; attempt++) {
    if (aborted()) return false;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* not ready yet, or blocked — the player will report if it's fatal */
    }
    await sleep(PLAYLIST_INTERVAL_MS);
  }
  return false;
}

export function CameraFullscreen({ entityId }: { entityId: string }) {
  const entity = useStore((s) => s.entities[entityId]);
  const creds = useStore((s) => s.creds);
  const close = useStore((s) => s.setFullscreenCamera);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [reason, setReason] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Kiosk WebViews often refuse autoplay; keep a way to start it by hand.
  const startPlayback = useCallback(() => {
    const element = video.current;
    if (!element) return;
    void element
      .play()
      .then(() => setStatus("live"))
      .catch(() => setStatus("blocked"));
  }, []);

  const streamable = entity ? supportsStream(entity) : false;
  // Snapshots run until live video takes over.
  const { src, error, handleImageError } = useCameraImage(
    entityId,
    status === "live" ? 0 : 1000,
  );

  const giveUp = useCallback((why: string) => {
    setReason(why);
    setStatus("unavailable");
  }, []);

  useEffect(() => {
    if (!entity || !creds) return;
    if (!streamable) {
      giveUp("this camera only provides snapshots");
      return;
    }
    let cancelled = false;
    const aborted = () => cancelled;
    let teardown: (() => void) | undefined;
    setStatus("connecting");
    setReason(null);

    (async () => {
      const path = await fetchCameraStream(entityId);
      if (cancelled) return;
      if (!path) {
        giveUp("Home Assistant couldn't start a stream for it");
        return;
      }
      const base = normalizeUrl(creds.url);
      // Same-origin (served from Home Assistant) keeps the URL relative, so a
      // https page never requests a http stream.
      const sameOrigin = new URL(base).origin === window.location.origin;
      const url = sameOrigin ? path : `${base}${path}`;

      if (sameOrigin && !(await waitForPlaylist(url, aborted))) {
        if (!cancelled) giveUp("the stream never became ready");
        return;
      }
      if (cancelled) return;

      const element = video.current;
      if (!element) return;
      const onPlaying = () => !cancelled && setStatus("live");
      element.addEventListener("playing", onPlaying);

      // React sets `muted` as a property, and WebKit only grants muted
      // autoplay when it sees the attribute before the source loads — the
      // classic reason video won't start in an iPad kiosk.
      element.muted = true;
      element.setAttribute("muted", "");
      element.setAttribute("playsinline", "");

      // Apple platforms play HLS natively, hardware-decoded and without
      // MediaSource — the dependable path on an iPad, and it means the
      // hls.js chunk is never downloaded there.
      if (element.canPlayType("application/vnd.apple.mpegurl")) {
        const onError = () =>
          !cancelled &&
          giveUp(
            `the tablet couldn't play the stream${
              element.error ? ` (${element.error.message || element.error.code})` : ""
            }`,
          );
        element.addEventListener("error", onError);
        element.src = url;
        element.load();
        teardown = () => {
          element.removeEventListener("playing", onPlaying);
          element.removeEventListener("error", onError);
          element.removeAttribute("src");
        };
      } else {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) {
          giveUp("this browser can't play the stream");
          return;
        }
        // hls.js recovers from the hiccups a freshly started stream throws.
        const hls = new Hls({ manifestLoadingMaxRetry: 6, levelLoadingMaxRetry: 6 });
        hls.loadSource(url);
        hls.attachMedia(element);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return;
          if (data.type === "networkError") hls.startLoad();
          else if (data.type === "mediaError") hls.recoverMediaError();
          else giveUp(`playback error (${data.details})`);
        });
        teardown = () => {
          element.removeEventListener("playing", onPlaying);
          hls.destroy();
        };
      }
      // Muted inline playback is normally allowed, but a locked-down kiosk
      // WebView can still refuse; fall back to a tap.
      void element.play().catch(() => {
        if (!cancelled) setStatus("blocked");
      });
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [entityId, entity, creds, streamable, giveUp, attempt]);

  if (!entity) return null;

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
        // Older WebViews only honour the vendor-prefixed attribute.
        {...{ "webkit-playsinline": "true" }}
        className={`max-h-full max-w-full object-contain ${
          status === "live" ? "" : "hidden"
        }`}
      />
      {status !== "live" &&
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

      <div
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="glass-pill flex items-center gap-2.5 px-5 py-2.5 text-[15px] font-medium">
          {status === "live" && (
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
          )}
          {friendlyName(entity)}
          {status === "connecting" && (
            <span className="text-[13px] text-ink/45">
              snapshots · starting live view…
            </span>
          )}
          {status === "blocked" && (
            <button
              onClick={startPlayback}
              className="pressable flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[13px] font-semibold text-ink-contrast"
            >
              <Play size={12} /> Play live
            </button>
          )}
          {status === "unavailable" && (
            <span className="text-[13px] text-ink/45">snapshots</span>
          )}
        </span>
        {status === "unavailable" && (
          <span className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-1.5 text-[12px] text-white/60 backdrop-blur-md">
            Live view unavailable — {reason}.
            {streamable && (
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="pressable flex items-center gap-1 text-white/85 underline underline-offset-2"
              >
                <RotateCw size={12} /> Retry
              </button>
            )}
          </span>
        )}
      </div>

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
