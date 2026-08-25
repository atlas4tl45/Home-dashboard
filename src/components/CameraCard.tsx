import type { HassEntity } from "home-assistant-js-websocket";
import { VideoOff } from "lucide-react";
import { useCameraImage } from "@/hooks/useCameraImage";
import { friendlyName } from "@/lib/entities";

export function CameraCard({
  entity,
  refreshMs = 4000,
  onClick,
}: {
  entity: HassEntity;
  refreshMs?: number;
  onClick?: () => void;
}) {
  const { src, error, unavailable, handleImageError } = useCameraImage(
    entity.entity_id,
    refreshMs,
  );
  const failed = error || unavailable;

  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`glass pressable relative aspect-video overflow-hidden ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={friendlyName(entity)}
          onError={handleImageError}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink/45">
          <VideoOff size={28} />
          <span className="text-sm">
            {unavailable ? "Camera offline" : error ? "No signal" : "Loading…"}
          </span>
        </div>
      )}
      <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-[13px] font-medium text-white backdrop-blur-md">
        {friendlyName(entity)}
      </span>
    </div>
  );
}
