import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/store/useStore";
import { ROOM_ICON_NAMES, RoomIcon } from "@/lib/icons";

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddRoomModal({ open, onClose }: AddRoomModalProps) {
  const addRoom = useStore((s) => s.addRoom);
  const rooms = useStore((s) => s.config?.rooms ?? []);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("sofa");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setIcon("sofa");
  };

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addRoom(name.trim(), icon);
      // The new room is appended last in config.rooms.
      const created = useStore.getState().config?.rooms.at(-1);
      onClose();
      reset();
      if (created) navigate(`/room/${created.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Add a room"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy || !name.trim()}>
            Create room
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Room name</span>
          <input
            autoFocus
            className="input"
            placeholder={rooms.length === 0 ? "Living Room" : "Kitchen"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Icon</span>
          <div className="grid grid-cols-8 gap-2">
            {ROOM_ICON_NAMES.map((n) => (
              <button
                key={n}
                onClick={() => setIcon(n)}
                className={`flex aspect-square items-center justify-center rounded-xl border transition-colors ${
                  icon === n
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-surface-2 text-muted hover:text-content"
                }`}
                aria-label={n}
              >
                <RoomIcon name={n} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
