import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  MonitorSmartphone,
  Moon,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/store/useStore";
import { ROOM_ICON_NAMES, RoomIcon } from "@/lib/icons";
import { normalizeUrl } from "@/api/ha";
import type { Theme } from "@/types";
import type { ShellContext } from "@/components/layout/AppShell";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: MonitorSmartphone },
];

export function Settings() {
  const { openAddRoom } = useOutletContext<ShellContext>();
  const theme = useStore((s) => s.config?.theme ?? "system");
  const setTheme = useStore((s) => s.setTheme);
  const rooms = useStore((s) => s.config?.rooms ?? []);
  const creds = useStore((s) => s.creds);
  const status = useStore((s) => s.status);
  const logout = useStore((s) => s.logout);
  const updateRoom = useStore((s) => s.updateRoom);
  const removeRoom = useStore((s) => s.removeRoom);
  const reorderRooms = useStore((s) => s.reorderRooms);

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...rooms];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderRooms(next.map((r) => r.id));
  };

  const roomToDelete = rooms.find((r) => r.id === deleteRoomId);

  return (
    <>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mx-auto w-full max-w-3xl">
        {/* Appearance */}
        <Section title="Appearance" desc="Choose how the dashboard looks.">
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                  theme === value
                    ? "border-accent bg-accent/10 text-content"
                    : "border-border bg-surface-2 text-muted hover:text-content"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Rooms */}
        <Section
          title="Rooms"
          desc="Rename, reorder, re-icon or delete your rooms."
          action={
            <button className="btn-outline" onClick={openAddRoom}>
              <Plus className="h-4 w-4" /> Add room
            </button>
          }
        >
          {rooms.length === 0 ? (
            <p className="text-sm text-muted">No rooms yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rooms.map((room, i) => (
                <li
                  key={room.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2.5"
                >
                  <IconPicker
                    value={room.icon}
                    onChange={(icon) => updateRoom(room.id, { icon })}
                  />
                  <input
                    className="input flex-1 bg-surface"
                    value={room.name}
                    onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                  />
                  <span className="text-xs text-muted">
                    {room.entities.length} item{room.entities.length === 1 ? "" : "s"}
                  </span>
                  <div className="flex flex-col">
                    <button
                      className="btn-ghost p-0.5"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      className="btn-ghost p-0.5"
                      onClick={() => move(i, 1)}
                      disabled={i === rooms.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    className="btn-ghost p-2 text-muted hover:text-red-500"
                    onClick={() => setDeleteRoomId(room.id)}
                    aria-label={`Delete ${room.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Connection */}
        <Section title="Home Assistant" desc="Your connection to Home Assistant.">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {creds ? normalizeUrl(creds.url) : "Not connected"}
              </div>
              <div className="text-xs capitalize text-muted">Status: {status}</div>
            </div>
            <button
              className="btn-outline shrink-0 text-red-500"
              onClick={() => setConfirmDisconnect(true)}
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          </div>
        </Section>
      </div>

      {/* Disconnect confirmation */}
      <Modal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        title="Disconnect Home Assistant?"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmDisconnect(false)}>
              Cancel
            </button>
            <button
              className="btn bg-red-500 text-white hover:opacity-90"
              onClick={() => {
                logout();
                setConfirmDisconnect(false);
              }}
            >
              Disconnect
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This removes your stored token from this browser. Your rooms and entity
          layout are kept. You'll need your token to reconnect.
        </p>
      </Modal>

      {/* Delete room confirmation */}
      <Modal
        open={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        title={`Delete ${roomToDelete?.name ?? "room"}?`}
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteRoomId(null)}>
              Cancel
            </button>
            <button
              className="btn bg-red-500 text-white hover:opacity-90"
              onClick={() => {
                if (deleteRoomId) removeRoom(deleteRoomId);
                setDeleteRoomId(null);
              }}
            >
              Delete room
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This removes the room and its layout. The underlying Home Assistant
          entities are not affected.
        </p>
      </Modal>
    </>
  );
}

function Section({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {desc && <p className="text-sm text-muted">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small popover for choosing a room icon. */
function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-content hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change icon"
      >
        <RoomIcon name={value} className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-12 z-20 grid w-56 grid-cols-6 gap-1.5 rounded-xl border border-border bg-surface p-2 shadow-card">
            {ROOM_ICON_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className={`flex aspect-square items-center justify-center rounded-lg ${
                  value === n
                    ? "bg-accent text-accent-fg"
                    : "text-muted hover:bg-surface-2 hover:text-content"
                }`}
                aria-label={n}
              >
                <RoomIcon name={n} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
