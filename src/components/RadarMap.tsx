// Animated weather radar, centred on your home.
//
// Map tiles from OpenStreetMap with RainViewer's free radar frames on top —
// no Home Assistant camera and no API key needed. Everything here is a plain
// image request, so a tablet without internet simply shows the failure
// rather than an empty box.

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Minus, Pause, Play, Plus } from "lucide-react";
import {
  baseTileUrl,
  fetchRadarIndex,
  project,
  radarTileUrl,
  tilesFor,
  TILE_SIZE,
  type RadarIndex,
} from "@/lib/radar";

const WIDTH = 640;
const HEIGHT = 340;
const FRAME_MS = 550;
const MIN_ZOOM = 4;
const MAX_ZOOM = 9;

export function RadarMap({
  latitude,
  longitude,
  initialZoom = 7,
}: {
  latitude: number;
  longitude: number;
  initialZoom?: number;
}) {
  const [index, setIndex] = useState<RadarIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [zoom, setZoom] = useState(initialZoom);
  const preloaded = useRef(new Set<string>());

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetchRadarIndex(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result) {
        setIndex(result);
        setFrame(Math.max(0, result.pastCount - 1)); // the latest observation
      } else {
        setFailed(true);
      }
    });
    return () => controller.abort();
  }, []);

  const center = useMemo(
    () => project(latitude, longitude, zoom),
    [latitude, longitude, zoom],
  );
  const tiles = useMemo(
    () => tilesFor(center, WIDTH, HEIGHT, zoom),
    [center, zoom],
  );

  // Step through the loop, pausing briefly on the newest frame.
  useEffect(() => {
    if (!playing || !index) return;
    const last = index.frames.length - 1;
    const timer = window.setTimeout(
      () => setFrame((f) => (f >= last ? 0 : f + 1)),
      frame === last ? FRAME_MS * 3 : FRAME_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, index, frame]);

  // Warm the next frame so the second loop onwards is smooth.
  useEffect(() => {
    if (!index) return;
    const next = index.frames[(frame + 1) % index.frames.length];
    for (const tile of tiles) {
      const url = radarTileUrl(index, next, zoom, tile.x, tile.y);
      if (preloaded.current.has(url)) continue;
      preloaded.current.add(url);
      const img = new Image();
      img.src = url;
    }
  }, [index, frame, tiles, zoom]);

  const current = index?.frames[frame];
  const stamp = current
    ? new Date(current.time * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const isForecast = index ? frame >= index.pastCount : false;

  return (
    <div>
      <div
        className="glass relative overflow-hidden"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: WIDTH, height: HEIGHT }}
        >
          {/* Base map */}
          {tiles.map((tile) => (
            <img
              key={`base-${tile.key}`}
              src={baseTileUrl(zoom, tile.x, tile.y)}
              alt=""
              draggable={false}
              className="absolute select-none opacity-90 dark:opacity-60 dark:invert"
              style={{
                left: tile.left,
                top: tile.top,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            />
          ))}
          {/* Radar overlay */}
          {index &&
            current &&
            tiles.map((tile) => (
              <img
                key={`radar-${tile.key}`}
                src={radarTileUrl(index, current, zoom, tile.x, tile.y)}
                alt=""
                draggable={false}
                className="absolute select-none"
                style={{
                  left: tile.left,
                  top: tile.top,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                }}
              />
            ))}
          {/* Home */}
          <span
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow-glass"
            aria-label="Home"
          />
        </div>

        {!index && !failed && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-[14px] text-ink/55">
            <Loader2 size={16} className="animate-spin" /> Loading radar…
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-ink/55">
            Couldn't reach the radar service. It needs internet access from
            this tablet.
          </div>
        )}

        {index && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/45 to-transparent px-3 py-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause radar" : "Play radar"}
              className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <span className="rounded-full bg-black/45 px-3 py-1 text-[13px] font-medium text-white backdrop-blur-md">
              {stamp}
              {isForecast && <span className="text-white/60"> · forecast</span>}
            </span>
            <span className="flex-1" />
            <button
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
              aria-label="Zoom out"
              className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            >
              <Minus size={15} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
              aria-label="Zoom in"
              className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-ink/45">
        Radar © RainViewer · Map © OpenStreetMap contributors
      </p>
    </div>
  );
}
