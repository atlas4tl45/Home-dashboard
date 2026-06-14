import { useState } from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { AddRoomModal } from "@/components/AddRoomModal";

/** Context handed to pages so they can open the add-room flow. */
export interface ShellContext {
  openAddRoom: () => void;
}

export function AppShell() {
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const ctx: ShellContext = { openAddRoom: () => setAddRoomOpen(true) };

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav onAddRoom={() => setAddRoomOpen(true)} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
        <Outlet context={ctx} />
      </main>
      <AddRoomModal open={addRoomOpen} onClose={() => setAddRoomOpen(false)} />
    </div>
  );
}
