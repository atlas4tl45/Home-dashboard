import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { GreetingHeader } from "@/components/GreetingHeader";
import { useStore } from "@/store/useStore";
import { domainIcon } from "@/lib/icons";
import { DOMAIN_LABELS, domainOf, isActive } from "@/lib/entities";
import type { ShellContext } from "@/components/layout/AppShell";

// Domains worth summarising on the home screen, in display order.
const SUMMARY_DOMAINS = [
  "light",
  "switch",
  "fan",
  "lock",
  "cover",
  "climate",
  "alarm_control_panel",
];

export function Home() {
  const { openAddRoom } = useOutletContext<ShellContext>();
  const rooms = useStore((s) => s.config?.rooms ?? []);
  const entities = useStore((s) => s.entities);

  const summary = useMemo(() => {
    const counts: Record<string, { total: number; active: number }> = {};
    for (const room of rooms) {
      for (const { entity_id } of room.entities) {
        const domain = domainOf(entity_id);
        if (!SUMMARY_DOMAINS.includes(domain)) continue;
        counts[domain] ??= { total: 0, active: 0 };
        counts[domain].total++;
        if (isActive(entities[entity_id])) counts[domain].active++;
      }
    }
    return SUMMARY_DOMAINS.filter((d) => counts[d]).map((d) => ({
      domain: d,
      ...counts[d],
    }));
  }, [rooms, entities]);

  const statusText = (domain: string, active: number, total: number) => {
    if (domain === "lock") return active === 0 ? "All locked" : `${active} unlocked`;
    if (domain === "alarm_control_panel")
      return active > 0 ? "Armed" : "Disarmed";
    if (domain === "cover") return active === 0 ? "All closed" : `${active} open`;
    return active === 0 ? "All off" : `${active} of ${total} on`;
  };

  return (
    <>
      <GreetingHeader />

      {summary.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            At a glance
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {summary.map(({ domain, active, total }) => {
              const Icon = domainIcon(domain);
              const on = active > 0;
              return (
                <div key={domain} className="card flex items-center gap-3 p-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      on ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {DOMAIN_LABELS[domain] ?? domain}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {statusText(domain, active, total)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {rooms.length === 0 && (
        <div className="card mt-2 flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted">No rooms yet. Create your first one.</p>
          <button className="btn-primary" onClick={openAddRoom}>
            <Plus className="h-4 w-4" /> Add a room
          </button>
        </div>
      )}
    </>
  );
}
