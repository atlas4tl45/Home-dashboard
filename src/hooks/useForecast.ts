import { useEffect, useState } from "react";
import { subscribeForecast, type ForecastEntry } from "@/lib/ha";
import { useStore } from "@/store/store";

/**
 * Live forecast for a weather entity. Home Assistant pushes updates over a
 * subscription rather than exposing them as attributes.
 */
export function useForecast(
  entityId: string | undefined,
  forecastType: "daily" | "hourly" = "daily",
): { forecast: ForecastEntry[]; loading: boolean } {
  const status = useStore((s) => s.status);
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setForecast([]);
    if (!entityId || status !== "connected") return;
    setLoading(true);
    const unsubscribe = subscribeForecast(entityId, forecastType, (entries) => {
      setForecast(entries);
      setLoading(false);
    });
    // Some entities never push (no forecast support) — don't spin forever.
    const giveUp = window.setTimeout(() => setLoading(false), 8000);
    return () => {
      window.clearTimeout(giveUp);
      unsubscribe();
    };
  }, [entityId, forecastType, status]);

  return { forecast, loading };
}
