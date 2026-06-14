import { NavLink } from "react-router-dom";
import { Home, Plus, Settings } from "lucide-react";
import { useStore } from "@/store/useStore";
import { RoomIcon } from "@/lib/icons";
import { ThemeToggle } from "./ThemeToggle";

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500 animate-pulse",
  disconnected: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-muted",
};

interface TopNavProps {
  onAddRoom: () => void;
}

export function TopNav({ onAddRoom }: TopNavProps) {
  const rooms = useStore((s) => s.config?.rooms ?? []);
  const status = useStore((s) => s.status);
  const saving = useStore((s) => s.saving);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
      isActive
        ? "bg-accent text-accent-fg shadow-[0_6px_18px_-6px_rgb(13_148_136_/_0.6)]"
        : "text-muted hover:text-content hover:bg-[rgb(var(--surface)/0.55)]"
    }`;

  return (
    <div className="glass sticky top-0 z-30 border-x-0 border-t-0">
      {/* Brand row */}
      <div className="flex items-center gap-3 px-4 pt-3 sm:px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-[0_6px_18px_-6px_rgb(13_148_136_/_0.7)]">
          <Home className="h-5 w-5" />
        </div>
        <span className="text-base font-semibold tracking-tight">Home</span>

        <div className="flex-1" />

        {saving && <span className="hidden text-xs text-muted sm:inline">Saving…</span>}
        <span
          className="flex items-center gap-1.5 text-xs text-muted"
          title={`Home Assistant: ${status}`}
        >
          <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status] ?? "bg-muted"}`} />
          <span className="hidden capitalize sm:inline">{status}</span>
        </span>

        <ThemeToggle />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `btn-ghost p-2 ${isActive ? "text-accent" : ""}`
          }
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </NavLink>
      </div>

      {/* Room tabs */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 pt-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rooms.map((room) => (
          <NavLink key={room.id} to={`/room/${room.id}`} className={tabClass}>
            <RoomIcon name={room.icon} className="h-4 w-4" />
            <span className="whitespace-nowrap">{room.name}</span>
          </NavLink>
        ))}
        <button
          onClick={onAddRoom}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[rgb(var(--surface)/0.4)] px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-content"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Room</span>
        </button>
      </div>
    </div>
  );
}
