// Editor for a tablet-created room: rename it and pick which devices live in
// it. Assigning a device moves it out of whichever room held it before.

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { useStore } from "@/store/store";
import {
  useEffectiveRegistry,
  useNamedEntities,
} from "@/hooks/useVisibleEntities";
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
  const entities = useNamedEntities();
  const registry = useEffectiveRegistry();
  const haRegistry = useStore((s) => s.registry);
  const renameRoom = useStore((s) => s.renameRoom);
  const toggleRoomEntity = useStore((s) => s.toggleRoomEntity);
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(entities)
      .filter(
        (e) =>
          isRoomAssignable(e) && !registry?.hiddenEntities.has(e.entity_id),
      )
      .filter(
        (e) =>
          !q ||
          friendlyName(e).toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        // Devices already in the room float to the top so the room reads
        // at a glance even with a large home.
        const aIn = room?.entityIds.includes(a.entity_id) ? 0 : 1;
        const bIn = room?.entityIds.includes(b.entity_id) ? 0 : 1;
        return aIn !== bIn
          ? aIn - bIn
          : friendlyName(a).localeCompare(friendlyName(b));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- membership order only needs to refresh when the list is refiltered
  }, [entities, registry, query]);

  const areaNames = useMemo(
    () => new Map((registry?.areas ?? []).map((a) => [a.area_id, a.name])),
    [registry],
  );
  const haAreaNames = useMemo(
    () => new Map((haRegistry?.areas ?? []).map((a) => [a.area_id, a.name])),
    [haRegistry],
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
      <label className="mt-3 flex h-12 items-center gap-2.5 rounded-2xl border border-ink/10 bg-[color:var(--field)] px-4">
        <Search size={17} className="shrink-0 text-ink/45" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all devices"
          className="w-full select-text bg-transparent text-[15px] placeholder:text-ink/45 focus:outline-none"
        />
      </label>
      <div className="mb-2 mt-4 text-[13px] font-medium text-ink/55">
        Devices in this room
      </div>
      <div className="no-scrollbar max-h-[50vh] space-y-1 overflow-y-auto">
        {candidates.map((entity) => {
          const inRoom = room.entityIds.includes(entity.entity_id);
          const customArea = registry?.entityArea[entity.entity_id];
          const haArea = haRegistry?.entityArea[entity.entity_id];
          // Where it lives now: another dashboard room, or (as a hint when
          // unplaced) its Home Assistant area.
          const elsewhere = !inRoom
            ? customArea
              ? `in ${areaNames.get(customArea)}`
              : haArea
                ? `HA area: ${haAreaNames.get(haArea)}`
                : undefined
            : undefined;
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
                  {elsewhere ? ` · ${elsewhere}` : ""}
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
