// Searchable entity picker for whole-home features (alarm, weather, …).
// Offers Automatic (first suitable entity) and Off alongside every entity
// of the feature's domain.

import { useMemo, useState } from "react";
import { Ban, Check, Search, Wand2 } from "lucide-react";
import { useStore } from "@/store/store";
import { domainOf, friendlyName } from "@/lib/entities";
import { Sheet } from "@/components/Sheet";

interface Props {
  title: string;
  domain: string;
  /** Current selection: undefined = automatic, "none" = off, else entity_id. */
  selection: string | undefined;
  onPick: (selection: string | null) => void;
  onClose: () => void;
}

export function EntityPickerSheet({
  title,
  domain,
  selection,
  onPick,
  onClose,
}: Props) {
  const entities = useStore((s) => s.entities);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(entities)
      .filter((e) => domainOf(e.entity_id) === domain)
      .filter(
        (e) =>
          !q ||
          friendlyName(e).toLowerCase().includes(q) ||
          e.entity_id.toLowerCase().includes(q),
      )
      .sort((a, b) => friendlyName(a).localeCompare(friendlyName(b)));
  }, [entities, domain, query]);

  function choose(value: string | null) {
    onPick(value);
    onClose();
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <label className="flex h-12 items-center gap-2.5 rounded-2xl border border-ink/10 bg-[color:var(--field)] px-4">
        <Search size={17} className="shrink-0 text-ink/45" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities"
          className="w-full select-text bg-transparent text-[15px] placeholder:text-ink/45 focus:outline-none"
        />
      </label>
      <div className="no-scrollbar mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
        <PickerRow
          selected={selection === undefined}
          onClick={() => choose(null)}
          icon={<Wand2 size={16} />}
          label="Automatic"
          detail="Use the first available entity"
        />
        <PickerRow
          selected={selection === "none"}
          onClick={() => choose("none")}
          icon={<Ban size={16} />}
          label="Off"
          detail="Don't show this on the dashboard"
        />
        {matches.map((entity) => (
          <PickerRow
            key={entity.entity_id}
            selected={selection === entity.entity_id}
            onClick={() => choose(entity.entity_id)}
            label={friendlyName(entity)}
            detail={entity.entity_id}
          />
        ))}
        {matches.length === 0 && (
          <p className="px-3 py-2 text-[14px] text-ink/55">
            No matching entities.
          </p>
        )}
      </div>
    </Sheet>
  );
}

function PickerRow({
  selected,
  onClick,
  label,
  detail,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.04]"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-ink text-ink-contrast" : "border border-ink/20 text-ink/55"
        }`}
      >
        {selected ? <Check size={14} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{label}</span>
        <span className="block truncate text-[12px] text-ink/45">{detail}</span>
      </span>
    </button>
  );
}
