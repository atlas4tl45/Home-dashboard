import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/store/useStore";
import { domainIcon } from "@/lib/icons";
import {
  CARD_DOMAINS,
  DOMAIN_LABELS,
  domainOf,
  friendlyName,
  stateLabel,
} from "@/lib/entities";

interface EntityPickerProps {
  open: boolean;
  roomId: string;
  onClose: () => void;
}

/** Browse all Home Assistant entities and add them to a room. */
export function EntityPicker({ open, roomId, onClose }: EntityPickerProps) {
  const entities = useStore((s) => s.entities);
  const room = useStore((s) => s.config?.rooms.find((r) => r.id === roomId));
  const addEntity = useStore((s) => s.addEntityToRoom);
  const removeEntity = useStore((s) => s.removeEntityFromRoom);

  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");

  const inRoom = useMemo(
    () => new Set(room?.entities.map((e) => e.entity_id) ?? []),
    [room],
  );

  const { list, domains } = useMemo(() => {
    const all = Object.values(entities)
      .filter((e) => CARD_DOMAINS.has(domainOf(e.entity_id)))
      .sort((a, b) =>
        friendlyName(a).localeCompare(friendlyName(b)),
      );
    const domainSet = new Set(all.map((e) => domainOf(e.entity_id)));
    const q = query.trim().toLowerCase();
    const filtered = all.filter((e) => {
      if (domainFilter !== "all" && domainOf(e.entity_id) !== domainFilter)
        return false;
      if (!q) return true;
      return (
        e.entity_id.toLowerCase().includes(q) ||
        friendlyName(e).toLowerCase().includes(q)
      );
    });
    return { list: filtered, domains: Array.from(domainSet).sort() };
  }, [entities, query, domainFilter]);

  const toggle = (entityId: string) => {
    if (inRoom.has(entityId)) removeEntity(roomId, entityId);
    else addEntity(roomId, { entity_id: entityId });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Add entities to ${room?.name ?? "room"}`}
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            className="input pl-9"
            placeholder="Search entities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            active={domainFilter === "all"}
            onClick={() => setDomainFilter("all")}
          />
          {domains.map((d) => (
            <FilterChip
              key={d}
              label={DOMAIN_LABELS[d] ?? d}
              active={domainFilter === d}
              onClick={() => setDomainFilter(d)}
            />
          ))}
        </div>

        <div className="-mx-1 max-h-[48vh] overflow-y-auto px-1">
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {Object.keys(entities).length === 0
                ? "No entities loaded yet — is Home Assistant connected?"
                : "No matching entities."}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {list.map((e) => {
                const Icon = domainIcon(domainOf(e.entity_id));
                const added = inRoom.has(e.entity_id);
                return (
                  <li key={e.entity_id}>
                    <button
                      onClick={() => toggle(e.entity_id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left hover:bg-surface-2"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {friendlyName(e)}
                        </div>
                        <div className="truncate text-xs text-muted">
                          {e.entity_id} · {stateLabel(e)}
                        </div>
                      </div>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          added
                            ? "bg-accent text-accent-fg"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-accent-fg"
          : "border border-border bg-surface-2 text-muted hover:text-content"
      }`}
    >
      {label}
    </button>
  );
}
