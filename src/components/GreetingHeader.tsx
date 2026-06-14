import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { weatherDisplay } from "@/lib/weather";
import { domainOf } from "@/lib/entities";

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** HaCasa-style hero: time-based greeting, live clock, and current weather. */
export function GreetingHeader() {
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
          <div className="text-2xl font-semibold tabular-nums sm:text-3xl">{time}</div>
        </div>
      </div>
    </header>
  );
}
