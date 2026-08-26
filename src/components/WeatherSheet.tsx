// Tap the weather chip for the forecast and radar. Radar is the built-in
// animated map by default; choosing a camera in Settings shows that instead.

import { useEffect, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { Droplets, Loader2, Wind } from "lucide-react";
import { useForecast } from "@/hooks/useForecast";
import { useStore } from "@/store/store";
import { friendlyName, weatherLabel } from "@/lib/entities";
import { weatherIcon } from "@/lib/weather";
import { CameraCard } from "@/components/CameraCard";
import { RadarMap } from "@/components/RadarMap";
import { fetchConfig } from "@/lib/ha";
import { Sheet } from "@/components/Sheet";

type Range = "daily" | "hourly";

export function WeatherSheet({
  entity,
  onClose,
}: {
  entity: HassEntity;
  onClose: () => void;
}) {
  const [range, setRange] = useState<Range>("daily");
  const { forecast, loading } = useForecast(entity.entity_id, range);
  const entities = useStore((s) => s.entities);
  const setFullscreenCamera = useStore((s) => s.setFullscreenCamera);
  const radarId = useStore((s) => s.features.radar);
  // A chosen camera wins; otherwise fall back to the built-in radar map.
  const radarCamera = radarId && radarId !== "none" ? entities[radarId] : undefined;
  const [home, setHome] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (radarCamera) return;
    let cancelled = false;
    void fetchConfig().then((config) => {
      if (cancelled || !config) return;
      if (typeof config.latitude === "number" && typeof config.longitude === "number") {
        setHome({ lat: config.latitude, lon: config.longitude });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [radarCamera]);

  const Icon = weatherIcon(entity.state);
  const unit = (entity.attributes.temperature_unit as string | undefined) ?? "°";
  const temperature = entity.attributes.temperature as number | undefined;
  const humidity = entity.attributes.humidity as number | undefined;
  const windSpeed = entity.attributes.wind_speed as number | undefined;
  const windUnit =
    (entity.attributes.wind_speed_unit as string | undefined) ?? "";

  return (
    <Sheet title={friendlyName(entity)} onClose={onClose}>
      <div className="flex items-center gap-4">
        <Icon size={44} className="shrink-0 text-ink/70" />
        <div className="min-w-0 flex-1">
          <div className="text-3xl font-light tabular-nums">
            {temperature != null ? `${Math.round(temperature)}${unit}` : "—"}
          </div>
          <div className="text-[15px] text-ink/55">
            {weatherLabel(entity.state)}
          </div>
        </div>
        <div className="shrink-0 space-y-1 text-right text-[13px] text-ink/55">
          {humidity != null && (
            <div className="flex items-center justify-end gap-1.5">
              <Droplets size={13} /> {Math.round(humidity)}%
            </div>
          )}
          {windSpeed != null && (
            <div className="flex items-center justify-end gap-1.5">
              <Wind size={13} /> {Math.round(windSpeed)} {windUnit}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {(["daily", "hourly"] as Range[]).map((option) => (
          <button
            key={option}
            onClick={() => setRange(option)}
            className={`pressable h-11 flex-1 rounded-full text-[14px] font-medium capitalize ${
              range === option
                ? "bg-ink text-ink-contrast"
                : "bg-ink/[0.06] text-ink/70"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="no-scrollbar mt-3 max-h-64 space-y-0.5 overflow-y-auto">
        {loading && forecast.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-6 text-[14px] text-ink/55">
            <Loader2 size={16} className="animate-spin" /> Loading forecast…
          </div>
        )}
        {!loading && forecast.length === 0 && (
          <p className="py-6 text-center text-[14px] text-ink/55">
            This weather entity doesn't publish a {range} forecast.
          </p>
        )}
        {forecast.slice(0, range === "daily" ? 10 : 24).map((entry) => {
          const when = new Date(entry.datetime);
          const EntryIcon = weatherIcon(entry.condition);
          const chance = entry.precipitation_probability;
          return (
            <div
              key={entry.datetime}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
            >
              <span className="w-16 shrink-0 text-[14px] text-ink/70">
                {range === "daily"
                  ? when.toLocaleDateString([], { weekday: "short" })
                  : when.toLocaleTimeString([], { hour: "numeric" })}
              </span>
              <EntryIcon size={18} className="shrink-0 text-ink/55" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink/45">
                {entry.condition ? weatherLabel(entry.condition) : ""}
              </span>
              {chance != null && chance > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-[13px] text-sky-600 dark:text-sky-400">
                  <Droplets size={12} /> {Math.round(chance)}%
                </span>
              )}
              <span className="w-20 shrink-0 text-right text-[14px] tabular-nums">
                {entry.temperature != null
                  ? `${Math.round(entry.temperature)}°`
                  : "—"}
                {entry.templow != null && (
                  <span className="text-ink/45">
                    {" "}
                    {Math.round(entry.templow)}°
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[13px] font-medium text-ink/55">Radar</div>
        {radarCamera ? (
          <CameraCard
            entity={radarCamera}
            refreshMs={30_000}
            onClick={() => {
              onClose();
              setFullscreenCamera(radarCamera.entity_id);
            }}
          />
        ) : home ? (
          <RadarMap latitude={home.lat} longitude={home.lon} />
        ) : (
          <p className="py-4 text-center text-[14px] text-ink/55">
            Loading radar…
          </p>
        )}
      </div>
    </Sheet>
  );
}
