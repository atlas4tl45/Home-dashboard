import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AddRoomModal } from "@/components/AddRoomModal";

/** Context handed to pages so they can open the mobile drawer / add-room flow. */
export interface ShellContext {
  openMenu: () => void;
  openAddRoom: () => void;
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addRoomOpen, setAddRoomOpen] = useState(false);

  const ctx: ShellContext = {
    openMenu: () => setDrawerOpen(true),
    openAddRoom: () => setAddRoomOpen(true),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-content">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <Sidebar onAddRoom={() => setAddRoomOpen(true)} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full animate-fade-in">
            <Sidebar
              onNavigate={() => setDrawerOpen(false)}
              onAddRoom={() => setAddRoomOpen(true)}
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Outlet context={ctx} />
      </main>

      <AddRoomModal open={addRoomOpen} onClose={() => setAddRoomOpen(false)} />
    </div>
  );
}
