// All cameras in a grid; tap one for a full-screen view with faster refresh.

import { X } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffectiveRegistry, useVisibleEntities } from "@/hooks/useVisibleEntities";
import { friendlyName, ofDomain } from "@/lib/entities";
import { CameraCard } from "@/components/CameraCard";
import { useCameraImage } from "@/hooks/useCameraImage";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

export function CamerasView() {
  const entities = useVisibleEntities();
  // Kept in the store so the idle timers know not to interrupt viewing.
  const fullscreen = useStore((s) => s.fullscreenCamera);
  const setFullscreen = useStore((s) => s.setFullscreenCamera);
  const registry = useEffectiveRegistry();
  const cameras = ofDomain(entities, "camera").filter(
    (e) => registry?.entityArea[e.entity_id],
  );

  return (
    <ViewShell>
      <ViewHeader title="Cameras" />
      {cameras.length === 0 ? (
        <div className="glass-soft p-8 text-center text-ink/55">
          No cameras found in Home Assistant.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cameras.map((camera) => (
            <CameraCard
              key={camera.entity_id}
              entity={camera}
              onClick={() => setFullscreen(camera.entity_id)}
            />
          ))}
        </div>
      )}
      {fullscreen && entities[fullscreen] && (
        <FullscreenCamera entityId={fullscreen} onClose={() => setFullscreen(null)} />
      )}
    </ViewShell>
  );
}

function FullscreenCamera({
  entityId,
  onClose,
}: {
  entityId: string;
  onClose: () => void;
}) {
  const entity = useStore((s) => s.entities[entityId]);
  const { src, error, unavailable, handleImageError } = useCameraImage(
    entityId,
    1000,
  );
  const failed = error || unavailable;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={friendlyName(entity)}
          onError={handleImageError}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="text-white/70">
          {unavailable ? "Camera offline" : error ? "No signal" : "Loading…"}
        </span>
      )}
      <span className="glass-pill absolute bottom-8 left-1/2 -translate-x-1/2 px-5 py-2.5 text-[15px] font-medium">
        {friendlyName(entity)}
      </span>
      <button
        aria-label="Close"
        onClick={onClose}
        className="glass-pill pressable absolute right-6 top-6 flex h-12 w-12 items-center justify-center"
      >
        <X size={22} />
      </button>
    </div>
  );
}
