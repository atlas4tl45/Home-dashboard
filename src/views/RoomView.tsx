// One room: every controllable device as a tile, cameras, and open/motion
// sensors as quiet chips.

import { useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { ChevronLeft, DoorOpen, Radar } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffectiveRegistry, useVisibleEntities } from "@/hooks/useVisibleEntities";
import {
  buildRooms,
  domainOf,
  friendlyName,
  isOn,
  stateLabel,
  supportsColor,
  supportsColorTemp,
} from "@/lib/entities";
import { DeviceTile } from "@/components/tiles/DeviceTile";
import { LockTile } from "@/components/tiles/LockTile";
import { ClimateTile } from "@/components/tiles/ClimateTile";
import { CameraCard } from "@/components/CameraCard";
import { LightSheet } from "@/components/LightSheet";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

export function RoomView({ areaId }: { areaId: string }) {
  const entities = useVisibleEntities();
  const registry = useEffectiveRegistry();
  const setFullscreenCamera = useStore((s) => s.setFullscreenCamera);
  const [sheetLight, setSheetLight] = useState<string | null>(null);

  const room = registry
    ? buildRooms(entities, registry).find((r) => r.area.area_id === areaId)
    : undefined;

  if (!room) {
    return (
      <ViewShell>
        <ViewHeader title="Room" leading={<BackButton />} />
        <div className="glass-soft p-8 text-center text-ink/55">
          This room is no longer available.
        </div>
      </ViewShell>
    );
  }

  const sensors = registry
    ? Object.values(entities).filter(
        (e) =>
          registry.entityArea[e.entity_id] === areaId &&
          domainOf(e.entity_id) === "binary_sensor" &&
          ["door", "window", "garage_door", "opening", "motion"].includes(
            (e.attributes.device_class as string) ?? "",
          ),
      )
    : [];

  const sheetEntity = sheetLight ? entities[sheetLight] : undefined;

  return (
    <ViewShell>
      <ViewHeader
        title={room.area.name}
        leading={
          <>
            <BackButton />
            {room.temperature && (
              <span className="text-2xl font-light text-ink/45">
                {room.temperature}
              </span>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {room.devices.map((entity) => {
          const domain = domainOf(entity.entity_id);
          if (domain === "climate")
            return <ClimateTile key={entity.entity_id} entity={entity} />;
          if (domain === "lock")
            return <LockTile key={entity.entity_id} entity={entity} />;
          const tunable =
            domain === "light" &&
            (supportsColorTemp(entity) || supportsColor(entity));
          return (
            <DeviceTile
              key={entity.entity_id}
              entity={entity}
              onLongPress={
                tunable ? () => setSheetLight(entity.entity_id) : undefined
              }
            />
          );
        })}
      </div>

      {room.cameras.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {room.cameras.map((camera) => (
            <CameraCard
              key={camera.entity_id}
              entity={camera}
              onClick={() => setFullscreenCamera(camera.entity_id)}
            />
          ))}
        </div>
      )}

      {sensors.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {sensors.map((sensor) => (
            <SensorChip key={sensor.entity_id} entity={sensor} />
          ))}
        </div>
      )}

      {sheetEntity && (
        <LightSheet entity={sheetEntity} onClose={() => setSheetLight(null)} />
      )}
    </ViewShell>
  );
}

function BackButton() {
  const navigate = useStore((s) => s.navigate);
  return (
    <button
      aria-label="Back"
      onClick={() => navigate({ name: "home" })}
      className="glass-pill pressable flex h-11 w-11 shrink-0 items-center justify-center text-ink/70"
    >
      <ChevronLeft size={22} />
    </button>
  );
}

function SensorChip({ entity }: { entity: HassEntity }) {
  const active = isOn(entity);
  const motion = entity.attributes.device_class === "motion";
  const Icon = motion ? Radar : DoorOpen;
  return (
    <span
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] ${
        active
          ? "border border-amber-500/25 bg-amber-300/20 text-amber-800 dark:text-amber-300"
          : "glass-soft rounded-full text-ink/55"
      }`}
    >
      <Icon size={14} />
      {friendlyName(entity)} · {stateLabel(entity)}
    </span>
  );
}
