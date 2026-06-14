import { Camera, VideoOff } from "lucide-react";
import type { HassEntity } from "@/types";
import { friendlyName, isUnavailable } from "@/lib/entities";
import { useSignedImage } from "@/hooks/useSignedImage";

/** Frameless camera thumbnails (rounded images, label overlay). */
export function HomeCameras({ cameras }: { cameras: HassEntity[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Cameras
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cameras.map((c) => (
          <CameraThumb key={c.entity_id} entity={c} />
        ))}
      </div>
    </div>
  );
}

function CameraThumb({ entity }: { entity: HassEntity }) {
  const unavailable = isUnavailable(entity);
  const { src, error } = useSignedImage(
    unavailable ? undefined : `/api/camera_proxy/${entity.entity_id}`,
    { refreshMs: 10_000, cacheBust: true },
  );

  return (
    <div className="group relative aspect-video overflow-hidden rounded-2xl bg-surface-2">
      {src && !error && !unavailable ? (
        <img src={src} alt={friendlyName(entity)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted">
          {unavailable || error ? (
            <>
              <VideoOff className="h-7 w-7" />
              <span className="text-xs">{unavailable ? "Unavailable" : "No snapshot"}</span>
            </>
          ) : (
            <Camera className="h-7 w-7 animate-pulse" />
          )}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        <span className="truncate text-sm font-medium text-white">
          {friendlyName(entity)}
        </span>
      </div>
    </div>
  );
}
