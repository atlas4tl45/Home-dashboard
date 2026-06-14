import { useEffect, useState } from "react";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import type { CardProps } from "./types";
import { callService, normalizeUrl, signPath } from "@/api/ha";
import { useStore } from "@/store/useStore";
import { isUnavailable } from "@/lib/entities";

export function MediaPlayerCard({ entity, name, editing, onRemove }: CardProps) {
  const creds = useStore((s) => s.creds);
  const base = creds ? normalizeUrl(creds.url) : "";
  const unavailable = isUnavailable(entity);
  const attrs = entity?.attributes ?? {};
  const state = entity?.state ?? "off";
  const off = state === "off" || state === "standby" || unavailable;
  const playing = state === "playing";

  const title = attrs.media_title;
  const artist = attrs.media_artist ?? attrs.media_album_name ?? attrs.app_name;

  // Local volume for smooth dragging.
  const [vol, setVol] = useState<number>(Math.round((attrs.volume_level ?? 0) * 100));
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) setVol(Math.round((attrs.volume_level ?? 0) * 100));
  }, [attrs.volume_level, dragging]);

  // Album art needs a signed URL when it's a local HA path.
  const [art, setArt] = useState<string | null>(null);
  const pic: string | undefined = attrs.entity_picture;
  useEffect(() => {
    let cancelled = false;
    if (!pic) {
      setArt(null);
      return;
    }
    if (/^https?:\/\//.test(pic)) {
      setArt(pic);
      return;
    }
    signPath(pic, 300)
      .then((p) => !cancelled && setArt(`${base}${p}`))
      .catch(() => !cancelled && setArt(null));
    return () => {
      cancelled = true;
    };
  }, [pic, base]);

  const call = (service: string, data?: Record<string, unknown>) =>
    callService("media_player", service, data, { entity_id: entity!.entity_id });

  return (
    <div className="card relative col-span-2 flex flex-col gap-3 p-4">
      {editing && onRemove && (
        <button
          onClick={onRemove}
          className="absolute -right-2 -top-2 z-10 rounded-full border border-border bg-surface p-1 text-muted shadow-card hover:text-red-500"
          aria-label={`Remove ${name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2 text-muted">
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{name}</div>
          <div className="truncate text-sm text-muted">
            {off
              ? unavailable
                ? "Unavailable"
                : "Off"
              : title
                ? artist
                  ? `${title} · ${artist}`
                  : title
                : state.charAt(0).toUpperCase() + state.slice(1)}
          </div>
        </div>
      </div>

      {!off && (
        <>
          <div className="flex items-center justify-center gap-2">
            <button className="btn-ghost p-2" onClick={() => call("media_previous_track")} aria-label="Previous">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              className="btn-primary h-11 w-11 rounded-full p-0"
              onClick={() => call("media_play_pause")}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button className="btn-ghost p-2" onClick={() => call("media_next_track")} aria-label="Next">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          {attrs.volume_level != null && (
            <div className="flex items-center gap-2.5">
              <Volume2 className="h-4 w-4 shrink-0 text-muted" />
              <Slider
                value={vol}
                aria-label={`${name} volume`}
                onChange={(v) => {
                  setDragging(true);
                  setVol(v);
                }}
                onCommit={(v) => {
                  setDragging(false);
                  call("volume_set", { volume_level: v / 100 });
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
