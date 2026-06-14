import { Link, useOutletContext } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { GreetingHeader } from "@/components/GreetingHeader";
import { useStore } from "@/store/useStore";
import { RoomIcon } from "@/lib/icons";
import { isActive } from "@/lib/entities";
import type { ShellContext } from "@/components/layout/AppShell";

export function Home() {
  const { openAddRoom } = useOutletContext<ShellContext>();
  const rooms = useStore((s) => s.config?.rooms ?? []);
  const entities = useStore((s) => s.entities);

  return (
    <>
      <GreetingHeader />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Rooms
        </h2>
        <button className="btn-ghost px-2 py-1 text-sm" onClick={openAddRoom}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted">No rooms yet. Create your first one.</p>
          <button className="btn-primary" onClick={openAddRoom}>
            <Plus className="h-4 w-4" /> Add a room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {rooms.map((room) => {
            const total = room.entities.length;
            const on = room.entities.filter((e) =>
              isActive(entities[e.entity_id]),
            ).length;
            return (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className="card group flex flex-col gap-6 p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                      on > 0
                        ? "bg-accent text-accent-fg shadow-[0_8px_20px_-8px_rgb(13_148_136_/_0.7)]"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    <RoomIcon name={room.icon} className="h-6 w-6" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
                <div>
                  <div className="truncate font-medium">{room.name}</div>
                  <div className="text-sm text-muted">
                    {total === 0
                      ? "Empty"
                      : on > 0
                        ? `${on} active · ${total} item${total === 1 ? "" : "s"}`
                        : `${total} item${total === 1 ? "" : "s"}`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
