import { useEffect, useRef } from "react";
import { Loader2, LogOut, RotateCw, WifiOff } from "lucide-react";
import { useStore } from "@/store/store";
import { SetupScreen } from "@/components/SetupScreen";
import { Dock } from "@/components/Dock";
import { HomeView } from "@/views/HomeView";
import { RoomView } from "@/views/RoomView";
import { CamerasView } from "@/views/CamerasView";
import { SecurityView } from "@/views/SecurityView";
import { SettingsView } from "@/views/SettingsView";

/** Soft ambient glow behind everything — the light the glass refracts. */
function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="animate-drift-slow absolute -left-1/4 -top-1/4 h-[70vmax] w-[70vmax] rounded-full bg-sky-300/50 blur-[120px]" />
      <div className="animate-drift-slower absolute -bottom-1/4 -right-1/4 h-[60vmax] w-[60vmax] rounded-full bg-violet-300/40 blur-[120px]" />
      <div className="absolute left-1/3 top-1/2 h-[40vmax] w-[40vmax] rounded-full bg-rose-200/40 blur-[100px]" />
    </div>
  );
}

export default function App() {
  const creds = useStore((s) => s.creds);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const view = useStore((s) => s.view);
  const connect = useStore((s) => s.connect);
  const attempted = useRef(false);

  // Saved credentials (or kiosk launch params) connect automatically.
  useEffect(() => {
    if (creds && status === "idle" && !attempted.current) {
      attempted.current = true;
      connect(creds).catch(() => {});
    }
  }, [creds, status, connect]);

  let content: React.ReactNode;
  if (!creds) {
    content = <SetupScreen />;
  } else if (status === "connected") {
    content = (
      <>
        {view.name === "home" && <HomeView />}
        {view.name === "room" && <RoomView areaId={view.areaId} />}
        {view.name === "cameras" && <CamerasView />}
        {view.name === "security" && <SecurityView />}
        {view.name === "settings" && <SettingsView />}
        <Dock />
      </>
    );
  } else if (status === "error") {
    content = <ConnectionLost message={error} />;
  } else {
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 size={32} className="animate-spin" />
        <span className="text-[15px]">Connecting to your home…</span>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Ambient />
      <div className="relative h-full">{content}</div>
    </div>
  );
}

function ConnectionLost({ message }: { message: string | null }) {
  const reconnect = useStore((s) => s.reconnect);
  const signOut = useStore((s) => s.signOut);
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="glass animate-rise w-full max-w-md rounded-4xl p-8 text-center shadow-glass-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/[0.06] text-slate-500">
          <WifiOff size={26} />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Can't reach your home</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
          {message ?? "The connection to Home Assistant was lost."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => void reconnect().catch(() => {})}
            className="pressable flex h-14 items-center gap-2 rounded-full bg-slate-900 px-6 text-[15px] font-semibold text-white"
          >
            <RotateCw size={17} /> Try again
          </button>
          <button
            onClick={signOut}
            className="glass-pill pressable flex h-14 items-center gap-2 px-6 text-[15px] font-medium text-slate-600"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
