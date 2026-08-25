import { useMemo } from "react";
import type { HassEntities } from "home-assistant-js-websocket";
import type { Registry } from "@/lib/ha";
import { useStore } from "@/store/store";

/**
 * Every entity, with this dashboard's display names applied. Renaming is a
 * local override — Home Assistant keeps its own name — so we rewrite
 * friendly_name at the source and the whole UI (tiles, search, sorting,
 * the screensaver) picks it up for free.
 */
export function useNamedEntities(): HassEntities {
  const entities = useStore((s) => s.entities);
  const names = useStore((s) => s.entityNames);
  return useMemo(() => {
    const ids = Object.keys(names);
    if (ids.length === 0) return entities;
    const named: HassEntities = { ...entities };
    for (const id of ids) {
      const entity = named[id];
      if (!entity) continue;
      named[id] = {
        ...entity,
        attributes: { ...entity.attributes, friendly_name: names[id] },
      };
    }
    return named;
  }, [entities, names]);
}

/** Named entities minus the ones hidden on this tablet. */
export function useVisibleEntities(): HassEntities {
  const entities = useNamedEntities();
  const hidden = useStore((s) => s.hiddenEntities);
  return useMemo(() => {
    if (hidden.length === 0) return entities;
    const visible: HassEntities = { ...entities };
    for (const id of hidden) delete visible[id];
    return visible;
  }, [entities, hidden]);
}

/**
 * The registry the views actually render from. The dashboard is fully
 * curated: only rooms created here exist, and only entities assigned to
 * them appear. Home Assistant areas are never rendered directly — they
 * serve as hints in the room editor's search.
 */
export function useEffectiveRegistry(): Registry | null {
  const registry = useStore((s) => s.registry);
  const customRooms = useStore((s) => s.customRooms);
  return useMemo(() => {
    if (!registry) return null;
    const entityArea: Record<string, string> = {};
    for (const room of customRooms) {
      for (const id of room.entityIds) entityArea[id] = room.id;
    }
    return {
      areas: customRooms.map((r) => ({ area_id: r.id, name: r.name })),
      entityArea,
      hiddenEntities: registry.hiddenEntities,
      entityPlatform: registry.entityPlatform,
    };
  }, [registry, customRooms]);
}
