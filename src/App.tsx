import { useEffect, useRef, useState } from "react";
import { Loader2, LogOut, RotateCw, WifiOff } from "lucide-react";
import { useStore } from "@/store/store";
import { useVersionWatcher } from "@/hooks/useVersionWatcher";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { Screensaver } from "@/components/Screensaver";
import { PinGate } from "@/components/PinGate";
import { SetupScreen } from "@/components/SetupScreen";
import { Dock } from "@/components/Dock";
import { HomeView } from "@/views/HomeView";
import { RoomView } from "@/views/RoomView";
import { CamerasView } from "@/views/CamerasView";
import { SecurityView } from "@/views/SecurityView";
import { SettingsView } from "@/views/SettingsView";

/**
 * Ambient light behind the glass: no hue at all — a soft daylight bloom from
 * the upper left and quiet neutral shading below, like light on plaster.
 */
function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-1/4 -top-1/3 h-[80vmax] w-[80vmax] rounded-full bg-white/80 blur-[140px] dark:bg-white/[0.05]" />
      <div className="absolute -bottom-1/3 -right-1/4 h-[70vmax] w-[70vmax] rounded-full bg-slate-400/25 blur-[140px] dark:bg-black/50" />
    </div>
  );
}

export default function App() {
  const creds = useStore((s) => s.creds);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const view = useStore((s) => s.view);
  const connect = useStore((s) => s.connect);
  const navigate = useStore((s) => s.navigate);
  const kiosk = useStore((s) => s.kiosk);
  const fullscreenCamera = useStore((s) => s.fullscreenCamera);
  const pinPrompt = useStore((s) => s.pinPrompt);
  const attempted = useRef(false);
  const [asleep, setAsleep] = useState(false);
  // Keep a wall tablet current without anyone touching it.
  useVersionWatcher();

  const live = status === "connected" && !asleep;
  // Wander back to the home screen when someone walks away mid-task —
  // except while they're watching cameras.
  useIdleTimeout(
    kiosk.returnHomeMs,
    () => navigate({ name: "home" }),
    live &&
      !fullscreenCamera &&
      view.name !== "home" &&
      view.name !== "cameras",
  );
  // Then go dark, so the panel isn't lighting the hallway all night.
  useIdleTimeout(
    kiosk.screensaverMs,
    () => setAsleep(true),
    live && !fullscreenCamera,
  );

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
      <div className="flex h-full flex-col items-center justify-center gap-4 text-ink/55">
        <Loader2 size={32} className="animate-spin" />
        <span className="text-[15px]">Connecting to your home…</span>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Ambient />
      <div className="relative h-full">{content}</div>
      {pinPrompt && <PinGate />}
      {asleep && <Screensaver onWake={() => setAsleep(false)} />}
    </div>
  );
}

function ConnectionLost({ message }: { message: string | null }) {
  const reconnect = useStore((s) => s.reconnect);
  const signOut = useStore((s) => s.signOut);
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="glass animate-rise w-full max-w-md rounded-4xl p-8 text-center shadow-glass-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink/[0.06] text-ink/55">
          <WifiOff size={26} />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Can't reach your home</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/55">
          {message ?? "The connection to Home Assistant was lost."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => void reconnect().catch(() => {})}
            className="pressable flex h-14 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-ink-contrast"
          >
            <RotateCw size={17} /> Try again
          </button>
          <button
            onClick={signOut}
            className="glass-pill pressable flex h-14 items-center gap-2 px-6 text-[15px] font-medium text-ink/70"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
