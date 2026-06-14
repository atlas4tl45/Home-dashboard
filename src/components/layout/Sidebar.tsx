import { NavLink } from "react-router-dom";
import { Home, Plus, Settings } from "lucide-react";
import { useStore } from "@/store/useStore";
import { RoomIcon } from "@/lib/icons";

interface SidebarProps {
  onNavigate?: () => void;
  onAddRoom?: () => void;
}

export function Sidebar({ onNavigate, onAddRoom }: SidebarProps) {
  const rooms = useStore((s) => s.config?.rooms ?? []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent text-accent-fg"
        : "text-muted hover:bg-surface-2 hover:text-content"
    }`;

  return (
    <nav className="flex h-full w-64 flex-col gap-1 border-r border-border bg-surface p-3">
      <div className="mb-3 flex items-center gap-2.5 px-2 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
          <Home className="h-5 w-5" />
        </div>
        <span className="text-base font-semibold">Home</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Rooms
        </div>
        {rooms.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted">No rooms yet.</p>
        )}
        {rooms.map((room) => (
          <NavLink
            key={room.id}
            to={`/room/${room.id}`}
            className={linkClass}
            onClick={onNavigate}
          >
            <RoomIcon name={room.icon} className="h-5 w-5 shrink-0" />
            <span className="truncate">{room.name}</span>
          </NavLink>
        ))}

        <button
          onClick={() => {
            onAddRoom?.();
            onNavigate?.();
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-content"
        >
          <Plus className="h-5 w-5" />
          Add room
        </button>
      </div>

      <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
        <Settings className="h-5 w-5" />
        Settings
      </NavLink>
    </nav>
  );
}
