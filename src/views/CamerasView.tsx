// All cameras in a grid; tap one for a live full-screen view.

import { useStore } from "@/store/store";
import { ofDomain } from "@/lib/entities";
import {
  useEffectiveRegistry,
  useVisibleEntities,
} from "@/hooks/useVisibleEntities";
import { CameraCard } from "@/components/CameraCard";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

export function CamerasView() {
  const entities = useVisibleEntities();
  const registry = useEffectiveRegistry();
  const setFullscreen = useStore((s) => s.setFullscreenCamera);
  const cameras = ofDomain(entities, "camera").filter(
    (e) => registry?.entityArea[e.entity_id],
  );

  return (
    <ViewShell>
      <ViewHeader title="Cameras" />
      {cameras.length === 0 ? (
        <div className="glass-soft p-8 text-center text-ink/55">
          No cameras added yet. Add one to a room in Settings.
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
    </ViewShell>
  );
}
