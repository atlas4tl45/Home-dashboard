// Floating glass dock: bottom-centered in portrait, left-centered in
// landscape. Sections only appear when the home actually has those devices.

import { Home, Settings, Shield, Video, type LucideIcon } from "lucide-react";
import { useStore } from "@/store/store";
import { useEffectiveRegistry, useVisibleEntities } from "@/hooks/useVisibleEntities";
import { ofDomain, resolveFeature } from "@/lib/entities";
import type { View } from "@/lib/types";

interface Item {
  key: View["name"];
  label: string;
  icon: LucideIcon;
}

export function Dock() {
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
  const kiosk = useStore((s) => s.kiosk);
  const requestSettings = useStore((s) => s.requestSettings);
  const entities = useVisibleEntities();

  const features = useStore((s) => s.features);
  const registry = useEffectiveRegistry();
  const assigned = registry?.entityArea ?? {};
  const hasCameras = ofDomain(entities, "camera").some(
    (e) => assigned[e.entity_id],
  );
  const hasSecurity =
    resolveFeature(entities, features.alarm, "alarm_control_panel") != null ||
    ofDomain(entities, "lock").some((e) => assigned[e.entity_id]);

  const items: Item[] = [
    { key: "home", label: "Home", icon: Home },
    ...(hasCameras ? [{ key: "cameras", label: "Cameras", icon: Video } as Item] : []),
    ...(hasSecurity
      ? [{ key: "security", label: "Security", icon: Shield } as Item]
      : []),
    ...(kiosk.hideSettings
      ? []
      : [{ key: "settings", label: "Settings", icon: Settings } as Item]),
  ];

  const active = view.name === "room" ? "home" : view.name;

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center landscape:inset-x-auto landscape:inset-y-0 landscape:left-5 landscape:items-center">
      <div className="glass-pill pointer-events-auto flex items-center gap-1 p-2 landscape:flex-col">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            aria-label={label}
            onClick={() =>
              key === "settings"
                ? requestSettings()
                : navigate({ name: key } as View)
            }
            className={`pressable flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
              active === key
                ? "bg-ink text-ink-contrast shadow-glass"
                : "text-ink/55"
            }`}
          >
            <Icon size={24} strokeWidth={2} />
          </button>
        ))}
      </div>
    </nav>
  );
}
