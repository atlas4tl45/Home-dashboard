import { ArrowDown, ArrowUp, Blinds, Square } from "lucide-react";
import { CardShell } from "./CardShell";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { isUnavailable } from "@/lib/entities";

export function CoverCard({ entity, name, editing, onRemove }: CardProps) {
  const unavailable = isUnavailable(entity);
  const state = entity?.state ?? "unknown";
  const position = entity?.attributes?.current_position;
  const open = state === "open" || (position ?? 0) > 0;

  const act = (service: string) =>
    callService("cover", service, undefined, { entity_id: entity!.entity_id });

  return (
    <CardShell
      icon={Blinds}
      name={name}
      subtitle={
        unavailable
          ? "Unavailable"
          : position != null
            ? `${position}% open`
            : open
              ? "Open"
              : "Closed"
      }
      active={open}
      unavailable={unavailable}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <div className="grid grid-cols-3 gap-1.5">
          <button className="btn-outline py-2" onClick={() => act("open_cover")} aria-label="Open">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button className="btn-outline py-2" onClick={() => act("stop_cover")} aria-label="Stop">
            <Square className="h-4 w-4" />
          </button>
          <button className="btn-outline py-2" onClick={() => act("close_cover")} aria-label="Close">
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </CardShell>
  );
}
