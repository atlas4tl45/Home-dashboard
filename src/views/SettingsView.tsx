// Settings: connection status, which rooms appear on the home screen, and
// kiosk tips. Deliberately small — the dashboard configures itself from
// Home Assistant's areas.

import { Eye, EyeOff, LogOut, RotateCw } from "lucide-react";
import { useStore } from "@/store/store";
import { buildRooms } from "@/lib/entities";
import { normalizeUrl } from "@/lib/ha";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

export function SettingsView() {
  const creds = useStore((s) => s.creds);
  const status = useStore((s) => s.status);
  const entities = useStore((s) => s.entities);
  const registry = useStore((s) => s.registry);
  const hiddenAreas = useStore((s) => s.hiddenAreas);
  const toggleAreaHidden = useStore((s) => s.toggleAreaHidden);
  const reconnect = useStore((s) => s.reconnect);
  const signOut = useStore((s) => s.signOut);

  const rooms = registry ? buildRooms(entities, registry) : [];

  return (
    <ViewShell>
      <ViewHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Home Assistant</h2>
          <p className="flex items-center gap-2 text-[15px] text-white/55">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected" ? "bg-emerald-300" : "bg-red-300"
              }`}
            />
            {creds ? normalizeUrl(creds.url) : "Not connected"}
            <span className="text-white/35">
              · {Object.keys(entities).length} entities
            </span>
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => void reconnect()}
              className="glass-pill pressable flex h-12 items-center gap-2 px-5 text-[14px] font-medium"
            >
              <RotateCw size={16} /> Reconnect
            </button>
            <button
              onClick={signOut}
              className="pressable flex h-12 items-center gap-2 rounded-full border border-red-300/25 bg-red-400/10 px-5 text-[14px] font-medium text-red-200"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </section>

        {rooms.length > 0 && (
          <section className="glass p-6">
            <h2 className="mb-1 text-[17px] font-semibold">Rooms</h2>
            <p className="mb-4 text-[14px] text-white/50">
              Rooms come from your Home Assistant areas. Hide any you don't
              want on this tablet.
            </p>
            <div className="space-y-1">
              {rooms.map((room) => {
                const hidden = hiddenAreas.includes(room.area.area_id);
                return (
                  <button
                    key={room.area.area_id}
                    onClick={() => toggleAreaHidden(room.area.area_id)}
                    className="pressable flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-white/[0.05]"
                  >
                    <span className={`text-[15px] ${hidden ? "text-white/35" : ""}`}>
                      {room.area.name}
                    </span>
                    {hidden ? (
                      <EyeOff size={18} className="text-white/30" />
                    ) : (
                      <Eye size={18} className="text-white/60" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="glass-soft p-6 text-[14px] leading-relaxed text-white/50">
          <h2 className="mb-1 text-[15px] font-semibold text-white/75">
            Wall-tablet tips
          </h2>
          <p>
            Add this page to your iPad home screen (Share → Add to Home Screen)
            for a full-screen app. Kiosk launchers can auto-connect by opening{" "}
            <span className="text-white/70">
              ?url=&lt;address&gt;&amp;token=&lt;token&gt;
            </span>
            . In iPadOS, use Guided Access to pin the dashboard on the wall.
          </p>
        </section>
      </div>
    </ViewShell>
  );
}
