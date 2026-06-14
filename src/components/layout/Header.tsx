import { Menu } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ThemeToggle } from "./ThemeToggle";
import type { ReactNode } from "react";

interface HeaderProps {
  title: ReactNode;
  onMenu: () => void;
  actions?: ReactNode;
}

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500 animate-pulse",
  disconnected: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-muted",
};

export function Header({ title, onMenu, actions }: HeaderProps) {
  const status = useStore((s) => s.status);
  const saving = useStore((s) => s.saving);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <button className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onMenu} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>

      {saving && <span className="hidden text-xs text-muted sm:inline">Saving…</span>}

      <span
        className="flex items-center gap-1.5 text-xs text-muted"
        title={`Home Assistant: ${status}`}
      >
        <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status] ?? "bg-muted"}`} />
        <span className="hidden capitalize sm:inline">{status}</span>
      </span>

      {actions}
      <ThemeToggle />
    </header>
  );
}
