import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { HassEntity } from "@/types";
import { callService } from "@/api/ha";
import { friendlyName } from "@/lib/entities";

/** Scenes as integrated icon shortcuts (no card chrome). */
export function HomeScenes({ scenes }: { scenes: HassEntity[] }) {
  const [flash, setFlash] = useState<string | null>(null);

  const run = (e: HassEntity) => {
    callService("scene", "turn_on", undefined, { entity_id: e.entity_id });
    setFlash(e.entity_id);
    setTimeout(() => setFlash((f) => (f === e.entity_id ? null : f)), 1200);
  };

  return (
    <div className="flex flex-wrap gap-x-7 gap-y-5">
      {scenes.map((e) => {
        const on = flash === e.entity_id;
        return (
          <button
            key={e.entity_id}
            onClick={() => run(e)}
            className="group flex w-16 flex-col items-center gap-2"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
                on
                  ? "bg-accent text-accent-fg"
                  : "bg-accent/10 text-accent group-hover:bg-accent/20"
              }`}
            >
              <Sparkles className="h-6 w-6" />
            </span>
            <span className="max-w-[72px] truncate text-center text-xs text-muted">
              {friendlyName(e)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
