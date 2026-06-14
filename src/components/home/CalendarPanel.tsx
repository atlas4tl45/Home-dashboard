import type { CalEvent } from "@/hooks/useCalendarEvents";

function isAllDay(start: string): boolean {
  // All-day events come back as a bare date ("2026-06-16"), not a datetime.
  return !/[T ]\d{2}:/.test(start);
}

function timeLabel(e: CalEvent): string {
  if (isAllDay(e.start)) return "All day";
  return new Date(e.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Frameless upcoming-events list (date marker + summary). */
export function CalendarPanel({ events }: { events: CalEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">Nothing coming up.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {events.map((e, i) => {
        const start = new Date(e.start);
        return (
          <li key={`${e.calendar}-${e.start}-${i}`} className="flex items-center gap-3.5 py-2.5">
            <div className="flex w-10 shrink-0 flex-col items-center">
              <span className="text-[10px] font-medium uppercase text-muted">
                {start.toLocaleDateString([], { weekday: "short" })}
              </span>
              <span className="text-lg font-semibold leading-none">{start.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{e.summary || "(busy)"}</div>
              <div className="truncate text-xs text-muted">{timeLabel(e)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
