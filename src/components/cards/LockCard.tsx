import { Lock, Unlock, LockKeyhole } from "lucide-react";
import { CardShell } from "./CardShell";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { isUnavailable } from "@/lib/entities";

export function LockCard({ entity, name, editing, onRemove }: CardProps) {
  const unavailable = isUnavailable(entity);
  const state = entity?.state ?? "unknown";
  const locked = state === "locked";
  const transitioning = state === "locking" || state === "unlocking";

  const act = (lock: boolean) =>
    callService("lock", lock ? "lock" : "unlock", undefined, {
      entity_id: entity!.entity_id,
    });

  const label = transitioning
    ? state === "locking"
      ? "Locking…"
      : "Unlocking…"
    : locked
      ? "Locked"
      : "Unlocked";

  return (
    <CardShell
      icon={locked ? Lock : Unlock}
      name={name}
      subtitle={unavailable ? "Unavailable" : label}
      active={!locked && !unavailable}
      unavailable={unavailable}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <button
          onClick={() => act(!locked)}
          disabled={transitioning}
          className={`btn w-full ${
            locked
              ? "btn-outline"
              : "bg-amber-500 text-white hover:opacity-90"
          }`}
        >
          <LockKeyhole className="h-4 w-4" />
          {locked ? "Unlock" : "Lock"}
        </button>
      )}
    </CardShell>
  );
}
