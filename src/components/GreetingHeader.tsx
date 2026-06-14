import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import { weatherDisplay } from "@/lib/weather";
import { domainOf } from "@/lib/entities";

const TRIPLE_TAP_MS = 700;

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * HaCasa-style hero: time-based greeting, live clock, and current weather.
 * Triple-tapping the clock reveals the hidden system/settings panel.
 */
export function GreetingHeader({ onReveal }: { onReveal?: () => void }) {
  const weatherId = useStore((s) => s.config?.weatherEntity);
  const entities = useStore((s) => s.entities);
  // Use the configured entity, else auto-detect the first weather.* entity.
  const weather = useMemo(() => {
    if (weatherId) return entities[weatherId];
    return Object.values(entities).find((e) => domainOf(e.entity_id) === "weather");
  }, [weatherId, entities]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const temp = weather?.attributes?.temperature;
  const unit = weather?.attributes?.temperature_unit ?? "°";
  const { Icon, label } = weatherDisplay(weather?.state);

  // Hidden gesture: three taps on the clock within a short window.
  const taps = useRef<number[]>([]);
  const onClockTap = () => {
    const t = Date.now();
    taps.current = taps.current.filter((p) => t - p < TRIPLE_TAP_MS);
    taps.current.push(t);
    if (taps.current.length >= 3) {
      taps.current = [];
      onReveal?.();
    }
  };

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(now)}
        </h1>
        <p className="mt-0.5 text-sm text-muted">{date}</p>
      </div>

      <div className="flex items-center gap-4">
        {weather && (
          <div className="flex items-center gap-2.5">
            <Icon className="h-7 w-7 text-accent" />
            <div className="leading-tight">
              {temp != null && (
                <div className="text-lg font-semibold tabular-nums">
                  {Math.round(Number(temp))}
                  {unit}
                </div>
              )}
              <div className="text-xs text-muted">{label}</div>
            </div>
          </div>
        )}
        <div className="text-right leading-none">
          <div
            onClick={onClockTap}
            className="cursor-default select-none text-2xl font-semibold tabular-nums sm:text-3xl"
            title=""
          >
            {time}
          </div>
        </div>
      </div>
    </header>
  );
}
