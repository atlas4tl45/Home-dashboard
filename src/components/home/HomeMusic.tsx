import { Music, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { HassEntity } from "@/types";
import { callService } from "@/api/ha";
import { friendlyName } from "@/lib/entities";
import { useSignedImage } from "@/hooks/useSignedImage";

/** Slim now-playing bars (one per active player). */
export function HomeMusic({ players }: { players: HassEntity[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Music
      </h2>
      {players.map((p) => (
        <MusicBar key={p.entity_id} entity={p} />
      ))}
    </div>
  );
}

function MusicBar({ entity }: { entity: HassEntity }) {
  const attrs = entity.attributes ?? {};
  const state = entity.state;
  const off = state === "off" || state === "standby" || state === "unavailable";
  const playing = state === "playing";
  const { src } = useSignedImage(attrs.entity_picture);

  const title = attrs.media_title;
  const artist = attrs.media_artist ?? attrs.media_album_name ?? attrs.app_name;

  const call = (service: string) =>
    callService("media_player", service, undefined, { entity_id: entity.entity_id });

  return (
    <div className="card flex items-center gap-3 px-3 py-2.5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 text-muted">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Music className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {off ? friendlyName(entity) : title || friendlyName(entity)}
        </div>
        <div className="truncate text-xs text-muted">
          {off ? "Off" : artist || friendlyName(entity)}
        </div>
      </div>
      {!off && (
        <div className="flex items-center gap-1">
          <button className="btn-ghost p-2" onClick={() => call("media_previous_track")} aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-fg"
            onClick={() => call("media_play_pause")}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button className="btn-ghost p-2" onClick={() => call("media_next_track")} aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
