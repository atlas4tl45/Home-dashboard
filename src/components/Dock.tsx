// Floating glass dock: bottom-centered in portrait, left-centered in
// landscape. Sections only appear when the home actually has those devices.

import { Home, Settings, Shield, Video, type LucideIcon } from "lucide-react";
import { useStore } from "@/store/store";
import { ofDomain } from "@/lib/entities";
import type { View } from "@/lib/types";

interface Item {
  key: View["name"];
  label: string;
  icon: LucideIcon;
}

export function Dock() {
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
  const entities = useStore((s) => s.entities);

  const hasCameras = ofDomain(entities, "camera").length > 0;
  const hasSecurity =
    ofDomain(entities, "alarm_control_panel").length > 0 ||
    ofDomain(entities, "lock").length > 0;

  const items: Item[] = [
    { key: "home", label: "Home", icon: Home },
    ...(hasCameras ? [{ key: "cameras", label: "Cameras", icon: Video } as Item] : []),
    ...(hasSecurity
      ? [{ key: "security", label: "Security", icon: Shield } as Item]
      : []),
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const active = view.name === "room" ? "home" : view.name;

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center landscape:inset-x-auto landscape:inset-y-0 landscape:left-5 landscape:items-center">
      <div className="glass-pill pointer-events-auto flex items-center gap-1 p-2 landscape:flex-col">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            aria-label={label}
            onClick={() => navigate({ name: key } as View)}
            className={`pressable flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
              active === key
                ? "bg-slate-900 text-white shadow-glass"
                : "text-slate-500"
            }`}
          >
            <Icon size={24} strokeWidth={2} />
          </button>
        ))}
      </div>
    </nav>
  );
}
