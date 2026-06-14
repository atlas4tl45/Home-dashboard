import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Theme } from "@/types";

const ORDER: Theme[] = ["light", "dark", "system"];
const ICONS = { light: Sun, dark: Moon, system: MonitorSmartphone };
const LABELS = { light: "Light", dark: "Dark", system: "System" };

export function ThemeToggle() {
  const theme = useStore((s) => s.config?.theme ?? "system");
  const setTheme = useStore((s) => s.setTheme);
  const Icon = ICONS[theme];

  const next = () => {
    const idx = ORDER.indexOf(theme);
    setTheme(ORDER[(idx + 1) % ORDER.length]);
  };

  return (
    <button
      onClick={next}
      className="btn-ghost p-2"
      aria-label={`Theme: ${LABELS[theme]}. Click to change.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
