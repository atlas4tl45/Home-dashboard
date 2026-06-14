import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { HassEntity } from "@/types";
import { callService } from "@/api/ha";
import { friendlyName } from "@/lib/entities";

/** Scenes as a compact row of pill buttons (no card chrome). */
export function HomeScenes({ scenes }: { scenes: HassEntity[] }) {
  const [flash, setFlash] = useState<string | null>(null);

  const run = (e: HassEntity) => {
    callService("scene", "turn_on", undefined, { entity_id: e.entity_id });
    setFlash(e.entity_id);
    setTimeout(() => setFlash((f) => (f === e.entity_id ? null : f)), 1200);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {scenes.map((e) => {
        const on = flash === e.entity_id;
        return (
          <button
            key={e.entity_id}
            onClick={() => run(e)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              on
                ? "bg-accent text-accent-fg"
                : "bg-surface-2 text-content hover:bg-surface"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${on ? "" : "text-accent"}`} />
            {friendlyName(e)}
          </button>
        );
      })}
    </div>
  );
}
