import { useEffect, useState } from "react";
import { callServiceWithResponse } from "@/api/ha";
import { useStore } from "@/store/useStore";

export interface CalEvent {
  start: string;
  end: string;
  summary: string;
  location?: string;
  calendar: string;
}

const REFRESH_MS = 15 * 60 * 1000;
const WINDOW_DAYS = 14;

/** Local "YYYY-MM-DD HH:MM:SS" string as Home Assistant expects. */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/** Upcoming events merged across the given calendar entities, soonest first. */
export function useCalendarEvents(entityIds: string[]): CalEvent[] {
  const status = useStore((s) => s.status);
  const key = entityIds.join(",");
  const [events, setEvents] = useState<CalEvent[]>([]);

  useEffect(() => {
    if (!entityIds.length || status !== "connected") return;
    let active = true;
    const run = async () => {
      try {
        const resp = await callServiceWithResponse<Record<string, { events: Omit<CalEvent, "calendar">[] }>>(
          "calendar",
          "get_events",
          { start_date_time: fmt(new Date()), end_date_time: fmt(new Date(Date.now() + WINDOW_DAYS * 864e5)) },
          { entity_id: entityIds },
        );
        const all: CalEvent[] = [];
        for (const id of entityIds) {
          for (const ev of resp?.[id]?.events ?? []) {
            all.push({ ...ev, calendar: id });
          }
        }
        all.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        if (active) setEvents(all.slice(0, 7));
      } catch {
        /* ignore */
      }
    };
    run();
    const t = window.setInterval(run, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status]);

  return events;
}
