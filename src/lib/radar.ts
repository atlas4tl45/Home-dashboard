// Web-mercator tile maths and RainViewer's public radar index.
//
// RainViewer publishes a free, key-less catalogue of recent radar frames;
// tiles are plain PNGs that overlay a standard slippy map.

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarIndex {
  host: string;
  frames: RadarFrame[];
  /** Frames before this index are observations; the rest are forecast. */
  pastCount: number;
}

const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";

interface RainViewerResponse {
  host?: string;
  radar?: {
    past?: RadarFrame[];
    nowcast?: RadarFrame[];
  };
}

/** Recent radar frames, oldest first, plus a couple of forecast frames. */
export async function fetchRadarIndex(
  signal?: AbortSignal,
): Promise<RadarIndex | null> {
  try {
    const res = await fetch(RAINVIEWER_INDEX, { signal, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as RainViewerResponse;
    const past = body.radar?.past ?? [];
    const nowcast = body.radar?.nowcast ?? [];
    const observed = past.slice(-8);
    const frames = [...observed, ...nowcast.slice(0, 2)];
    if (frames.length === 0) return null;
    return {
      host: body.host ?? "https://tilecache.rainviewer.com",
      frames,
      pastCount: observed.length,
    };
  } catch {
    return null; // offline, blocked, or the service moved
  }
}

export const TILE_SIZE = 256;

/** Fractional tile coordinates for a location at a zoom level. */
export function project(lat: number, lon: number, zoom: number) {
  const scale = 2 ** zoom;
  const x = ((lon + 180) / 360) * scale;
  const rad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale;
  return { x, y };
}

/** Base map tile (OpenStreetMap standard tiles). */
export const baseTileUrl = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/** Radar overlay tile: colour scheme 4 with smoothing, snow shown separately. */
export const radarTileUrl = (
  index: RadarIndex,
  frame: RadarFrame,
  z: number,
  x: number,
  y: number,
) => `${index.host}${frame.path}/${TILE_SIZE}/${z}/${x}/${y}/4/1_1.png`;

/** Which tiles cover a viewport centred on a projected point. */
export function tilesFor(
  center: { x: number; y: number },
  width: number,
  height: number,
  zoom: number,
) {
  const max = 2 ** zoom;
  const cols = Math.ceil(width / TILE_SIZE / 2) + 1;
  const rows = Math.ceil(height / TILE_SIZE / 2) + 1;
  const tiles: { key: string; x: number; y: number; left: number; top: number }[] =
    [];
  for (let dx = -cols; dx <= cols; dx++) {
    for (let dy = -rows; dy <= rows; dy++) {
      const tx = Math.floor(center.x) + dx;
      const ty = Math.floor(center.y) + dy;
      if (ty < 0 || ty >= max) continue;
      tiles.push({
        key: `${tx}:${ty}`,
        x: ((tx % max) + max) % max, // wrap around the antimeridian
        y: ty,
        left: (tx - center.x) * TILE_SIZE + width / 2,
        top: (ty - center.y) * TILE_SIZE + height / 2,
      });
    }
  }
  return tiles;
}
