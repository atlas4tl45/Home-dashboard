import { NavLink } from "react-router-dom";
import { Home, Plus, Settings } from "lucide-react";
import { useStore } from "@/store/useStore";
import { RoomIcon } from "@/lib/icons";
import { ThemeToggle } from "./ThemeToggle";

interface RailProps {
  onAddRoom: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500 animate-pulse",
  disconnected: "bg-amber-500",
  error: "bg-red-500",
  idle: "bg-muted",
};

/** Slim vertical icon rail for room navigation (HaCasa-style). */
export function Rail({ onAddRoom }: RailProps) {
  const rooms = useStore((s) => s.config?.rooms ?? []);
  const status = useStore((s) => s.status);

  return (
    <nav className="sticky top-0 flex h-screen w-[76px] shrink-0 flex-col items-center gap-2 border-r border-border bg-surface px-2 py-3">
      <NavLink to="/" end className={itemClass} title="Home" aria-label="Home">
        {({ isActive }) => (
          <RailButton active={isActive}>
            <Home className="h-5 w-5" />
          </RailButton>
        )}
      </NavLink>

      <div className="my-1 h-px w-8 bg-border" />

      <div className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rooms.map((room) => (
          <NavLink
            key={room.id}
            to={`/room/${room.id}`}
            className={itemClass}
            title={room.name}
            aria-label={room.name}
          >
            {({ isActive }) => (
              <RailButton active={isActive} label={room.name}>
                <RoomIcon name={room.icon} className="h-5 w-5" />
              </RailButton>
            )}
          </NavLink>
        ))}

        <button
          onClick={onAddRoom}
          title="Add room"
          aria-label="Add room"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-border text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span
          className="my-1 flex h-2 w-2 rounded-full"
          title={`Home Assistant: ${status}`}
        >
          <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status] ?? "bg-muted"}`} />
        </span>
        <ThemeToggle />
        <NavLink to="/settings" className={itemClass} title="Settings" aria-label="Settings">
          {({ isActive }) => (
            <RailButton active={isActive}>
              <Settings className="h-5 w-5" />
            </RailButton>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

const itemClass = "w-full";

function RailButton({
  active,
  label,
  children,
}: {
  active: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
          active
            ? "bg-accent text-accent-fg shadow-[0_8px_20px_-8px_rgb(13_148_136_/_0.7)]"
            : "text-muted hover:bg-surface-2 hover:text-content"
        }`}
      >
        {children}
      </span>
      {label && (
        <span
          className={`max-w-[68px] truncate text-[10px] leading-tight ${
            active ? "text-content" : "text-muted"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
