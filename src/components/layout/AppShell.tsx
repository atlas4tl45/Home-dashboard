import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Rail } from "./Rail";
import { AddRoomModal } from "@/components/AddRoomModal";

/** Context handed to pages so they can open the add-room flow. */
export interface ShellContext {
  openAddRoom: () => void;
}

export function AppShell() {
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const ctx: ShellContext = { openAddRoom: () => setAddRoomOpen(true) };

  return (
    <div className="flex min-h-screen">
      <Rail onAddRoom={() => setAddRoomOpen(true)} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
          <Outlet context={ctx} />
        </div>
      </main>
      <AddRoomModal open={addRoomOpen} onClose={() => setAddRoomOpen(false)} />
    </div>
  );
}
