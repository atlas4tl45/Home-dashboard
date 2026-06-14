import { useEffect, useState } from "react";
import { callServiceWithResponse } from "@/api/ha";
import { useStore } from "@/store/useStore";

export interface ForecastDay {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
}

const REFRESH_MS = 30 * 60 * 1000;

/**
 * Daily weather forecast for a weather entity. Uses the modern
 * `weather.get_forecasts` service, falling back to a legacy `forecast`
 * attribute if present.
 */
export function useForecast(entityId: string | undefined): ForecastDay[] {
  const status = useStore((s) => s.status);
  const fallback = useStore((s) =>
    entityId ? (s.entities[entityId]?.attributes?.forecast as ForecastDay[]) : undefined,
  );
  const [days, setDays] = useState<ForecastDay[]>([]);

  useEffect(() => {
    if (!entityId || status !== "connected") return;
    let active = true;
    const run = async () => {
      try {
        const resp = await callServiceWithResponse<Record<string, { forecast: ForecastDay[] }>>(
          "weather",
          "get_forecasts",
          { type: "daily" },
          { entity_id: entityId },
        );
        const f = resp?.[entityId]?.forecast;
        if (active && Array.isArray(f)) setDays(f);
      } catch {
        /* keep fallback */
      }
    };
    run();
    const t = window.setInterval(run, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [entityId, status]);

  const result = days.length ? days : Array.isArray(fallback) ? fallback : [];
  return result.slice(0, 7);
}
