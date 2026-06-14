import { useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Pencil, Plus, LayoutGrid } from "lucide-react";
import { EntityCard } from "@/components/cards/EntityCard";
import { EntityPicker } from "@/components/EntityPicker";
import { useStore } from "@/store/useStore";
import { RoomIcon } from "@/lib/icons";

export function RoomView() {
  const { roomId } = useParams();
  const room = useStore((s) => s.config?.rooms.find((r) => r.id === roomId));
  const removeEntity = useStore((s) => s.removeEntityFromRoom);

  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!room) {
    return (
      <div className="card p-8 text-center text-muted">
        This room no longer exists.
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <RoomIcon name={room.icon} className="h-6 w-6" />
        </div>
        <h1 className="flex-1 truncate text-2xl font-semibold tracking-tight">
          {room.name}
        </h1>
        <button
          className={editing ? "btn-primary" : "btn-outline"}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          <span className="hidden sm:inline">{editing ? "Done" : "Edit"}</span>
        </button>
        <button className="btn-primary" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

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
    <div className="card flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
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
