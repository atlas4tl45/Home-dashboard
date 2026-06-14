import { useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Check, Pencil, Plus, LayoutGrid } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { EntityCard } from "@/components/cards/EntityCard";
import { EntityPicker } from "@/components/EntityPicker";
import { useStore } from "@/store/useStore";
import type { ShellContext } from "@/components/layout/AppShell";

export function RoomView() {
  const { roomId } = useParams();
  const { openMenu } = useOutletContext<ShellContext>();
  const room = useStore((s) => s.config?.rooms.find((r) => r.id === roomId));
  const removeEntity = useStore((s) => s.removeEntityFromRoom);

  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!room) {
    return (
      <>
        <Header title="Room" onMenu={openMenu} />
        <div className="p-6 text-muted">This room no longer exists.</div>
      </>
    );
  }

  return (
    <>
      <Header
        title={room.name}
        onMenu={openMenu}
        actions={
          <>
            <button
              className={editing ? "btn-primary px-3" : "btn-ghost p-2"}
              onClick={() => setEditing((v) => !v)}
              aria-label={editing ? "Done editing" : "Edit room"}
              title={editing ? "Done" : "Edit"}
            >
              {editing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
            </button>
            <button
              className="btn-ghost p-2"
              onClick={() => setPickerOpen(true)}
              aria-label="Add entities"
              title="Add entities"
            >
              <Plus className="h-5 w-5" />
            </button>
          </>
        }
      />

      <div className="p-4 sm:p-6">
        {room.entities.length === 0 ? (
          <EmptyState onAdd={() => setPickerOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {room.entities.map((item) => (
              <EntityCard
                key={item.entity_id}
                item={item}
                editing={editing}
                onRemove={() => removeEntity(room.id, item.entity_id)}
              />
            ))}
          </div>
        )}
      </div>

      <EntityPicker
        open={pickerOpen}
        roomId={room.id}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <LayoutGrid className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">No entities in this room yet</p>
        <p className="text-sm text-muted">Add lights, climate, locks, cameras and more.</p>
      </div>
      <button className="btn-primary" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Add entities
      </button>
    </div>
  );
}
