// Give a device the name you actually call it. This only changes what this
// dashboard shows — Home Assistant keeps its own name, so automations,
// voice assistants and the HA app are untouched.

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/store/store";
import { Sheet } from "@/components/Sheet";

export function RenameSheet({
  entityId,
  onClose,
}: {
  entityId: string;
  onClose: () => void;
}) {
  const entity = useStore((s) => s.entities[entityId]);
  const custom = useStore((s) => s.entityNames[entityId]);
  const setEntityName = useStore((s) => s.setEntityName);
  const haName =
    (entity?.attributes.friendly_name as string | undefined) ?? entityId;
  const [draft, setDraft] = useState(custom ?? haName);

  function commit(value: string) {
    setDraft(value);
    // An empty field (or the Home Assistant name typed back) clears the override.
    setEntityName(entityId, value.trim() === haName ? null : value);
  }

  return (
    <Sheet title="Rename device" onClose={onClose}>
      <input
        value={draft}
        onChange={(e) => commit(e.target.value)}
        placeholder={haName}
        autoFocus
        className="h-14 w-full select-text rounded-2xl border border-ink/10 bg-[color:var(--field)] px-4 text-[15px] font-medium placeholder:text-ink/45 focus:border-ink/30 focus:outline-none"
      />
      <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
        Shown on this dashboard only. Home Assistant still calls it{" "}
        <span className="text-ink/70">{haName}</span>.
        <span className="mt-1 block truncate text-ink/45">{entityId}</span>
      </p>
      {custom && (
        <button
          onClick={() => {
            setDraft(haName);
            setEntityName(entityId, null);
          }}
          className="glass-pill pressable mt-4 flex h-12 items-center gap-2 px-5 text-[14px] font-medium"
        >
          <RotateCcw size={16} /> Use the Home Assistant name
        </button>
      )}
    </Sheet>
  );
}
