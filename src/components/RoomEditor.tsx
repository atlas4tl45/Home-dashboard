// Editor for a tablet-created room: rename it and pick which devices live in
// it. Assigning a device moves it out of whichever room held it before.

import { useMemo } from "react";
import { Check } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffectiveRegistry } from "@/hooks/useVisibleEntities";
import { friendlyName, isRoomAssignable } from "@/lib/entities";
import { Sheet } from "@/components/Sheet";

export function RoomEditor({
  roomId,
  onClose,
}: {
  roomId: string;
  onClose: () => void;
}) {
  const room = useStore((s) => s.customRooms.find((r) => r.id === roomId));
  const entities = useStore((s) => s.entities);
  const registry = useEffectiveRegistry();
  const renameRoom = useStore((s) => s.renameRoom);
  const toggleRoomEntity = useStore((s) => s.toggleRoomEntity);

  const candidates = useMemo(
    () =>
      Object.values(entities)
        .filter(
          (e) =>
            isRoomAssignable(e) && !registry?.hiddenEntities.has(e.entity_id),
        )
        .sort((a, b) => friendlyName(a).localeCompare(friendlyName(b))),
    [entities, registry],
  );

  const areaNames = useMemo(
    () => new Map((registry?.areas ?? []).map((a) => [a.area_id, a.name])),
    [registry],
  );

  if (!room) return null;

  return (
    <Sheet title="Edit room" onClose={onClose}>
      <input
        value={room.name}
        onChange={(e) => renameRoom(roomId, e.target.value)}
        placeholder="Room name"
        className="h-14 w-full select-text rounded-2xl border border-ink/10 bg-[color:var(--field)] px-4 text-[15px] font-medium placeholder:text-ink/45 focus:border-ink/30 focus:outline-none"
      />
      <div className="mb-2 mt-4 text-[13px] font-medium text-ink/55">
        Devices in this room
      </div>
      <div className="no-scrollbar max-h-[50vh] space-y-1 overflow-y-auto">
        {candidates.map((entity) => {
          const inRoom = room.entityIds.includes(entity.entity_id);
          const currentArea = registry?.entityArea[entity.entity_id];
          const elsewhere =
            !inRoom && currentArea ? areaNames.get(currentArea) : undefined;
          return (
            <button
              key={entity.entity_id}
              onClick={() => toggleRoomEntity(roomId, entity.entity_id)}
              className="pressable flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.04]"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  inRoom ? "bg-ink text-ink-contrast" : "border border-ink/20"
                }`}
              >
                {inRoom && <Check size={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">
                  {friendlyName(entity)}
                </span>
                <span className="block truncate text-[12px] text-ink/45">
                  {entity.entity_id}
                  {elsewhere ? ` · in ${elsewhere}` : ""}
                </span>
              </span>
            </button>
          );
        })}
        {candidates.length === 0 && (
          <p className="px-3 py-2 text-[14px] text-ink/55">
            No controllable devices found.
          </p>
        )}
      </div>
    </Sheet>
  );
}
