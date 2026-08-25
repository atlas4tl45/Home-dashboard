// Security: alarm panel, every lock, and door/window sensors at a glance.

import { DoorClosed, DoorOpen } from "lucide-react";
import { useStore } from "@/store/store";
import {
  friendlyName,
  isOn,
  isUnavailable,
  ofDomain,
  openingSensors,
} from "@/lib/entities";
import { AlarmPanel } from "@/components/AlarmPanel";
import { LockTile } from "@/components/tiles/LockTile";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

export function SecurityView() {
  const entities = useStore((s) => s.entities);
  const alarms = ofDomain(entities, "alarm_control_panel");
  const locks = ofDomain(entities, "lock");
  const openings = openingSensors(entities);
  const openCount = openings.filter((e) => isOn(e)).length;

  return (
    <ViewShell>
      <ViewHeader title="Security" />
      <div className="space-y-6">
        {alarms.map((alarm) => (
          <AlarmPanel key={alarm.entity_id} entity={alarm} />
        ))}

        {locks.length > 0 && (
          <section>
            <h2 className="mb-3 text-[15px] font-medium text-ink/55">Locks</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {locks.map((lock) => (
                <LockTile key={lock.entity_id} entity={lock} />
              ))}
            </div>
          </section>
        )}

        {openings.length > 0 && (
          <section>
            <h2 className="mb-3 text-[15px] font-medium text-ink/55">
              Doors &amp; windows
              {openCount > 0 && (
                <span className="ml-2 text-amber-700 dark:text-amber-300">{openCount} open</span>
              )}
            </h2>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {openings.map((sensor) => {
                const open = isOn(sensor);
                return (
                  <div
                    key={sensor.entity_id}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${
                      open
                        ? "border border-amber-500/25 bg-amber-300/20"
                        : "glass-soft rounded-2xl"
                    } ${isUnavailable(sensor) ? "opacity-40" : ""}`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        open ? "bg-amber-400 text-white" : "bg-ink/[0.06] text-ink/55"
                      }`}
                    >
                      {open ? <DoorOpen size={17} /> : <DoorClosed size={17} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {friendlyName(sensor)}
                    </span>
                    <span
                      className={`text-[13px] ${open ? "text-amber-700 dark:text-amber-300" : "text-ink/45"}`}
                    >
                      {isUnavailable(sensor) ? "—" : open ? "Open" : "Closed"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </ViewShell>
  );
}
