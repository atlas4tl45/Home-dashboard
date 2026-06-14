import { useMemo, useState, type ReactNode } from "react";
import { GreetingHeader } from "@/components/GreetingHeader";
import { WeatherForecast } from "@/components/home/WeatherForecast";
import { HomeSecurity } from "@/components/home/HomeSecurity";
import { HomeScenes } from "@/components/home/HomeScenes";
import { CalendarPanel } from "@/components/home/CalendarPanel";
import { HomeCameras } from "@/components/home/HomeCameras";
import { SystemPanel } from "@/components/SystemPanel";
import { useStore } from "@/store/useStore";
import { useForecast } from "@/hooks/useForecast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { domainOf, friendlyName } from "@/lib/entities";
import type { HassEntity } from "@/types";

export function Home() {
  const entities = useStore((s) => s.entities);
  const weatherPref = useStore((s) => s.config?.weatherEntity);
  const [sysOpen, setSysOpen] = useState(false);

  const { alarms, scenes, cameras, calendarIds, weatherId, unit } = useMemo(() => {
    const list = Object.values(entities);
    const byName = (a: HassEntity, b: HassEntity) =>
      friendlyName(a).localeCompare(friendlyName(b));
    const pick = (domain: string) =>
      list.filter((e) => domainOf(e.entity_id) === domain).sort(byName);
    const weather =
      (weatherPref && entities[weatherPref]) ||
      list.find((e) => domainOf(e.entity_id) === "weather");
    return {
      alarms: pick("alarm_control_panel"),
      scenes: pick("scene"),
      cameras: pick("camera"),
      calendarIds: pick("calendar").map((e) => e.entity_id),
      weatherId: weather?.entity_id,
      unit: weather?.attributes?.temperature_unit ?? "°",
    };
  }, [entities, weatherPref]);

  const forecast = useForecast(weatherId);
  const events = useCalendarEvents(calendarIds);

  const hasContent =
    forecast.length > 0 ||
    alarms.length > 0 ||
    scenes.length > 0 ||
    calendarIds.length > 0 ||
    cameras.length > 0;

  return (
    <>
      <div className="card overflow-hidden p-5 sm:p-7">
        <GreetingHeader onReveal={() => setSysOpen(true)} />

        {hasContent ? (
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-7 border-t border-border pt-6 sm:grid-cols-6">
            {forecast.length > 0 && (
              <Region label="Forecast" className="sm:col-span-6">
                <WeatherForecast days={forecast} unit={unit} />
              </Region>
            )}

            {alarms.length > 0 && (
              <Region label="Security" className="sm:col-span-4">
                <HomeSecurity alarms={alarms} />
              </Region>
            )}

            {calendarIds.length > 0 && (
              <Region
                label="Up next"
                className="sm:col-span-2 sm:row-span-2 sm:border-l sm:border-border sm:pl-8"
              >
                <CalendarPanel events={events} />
              </Region>
            )}

            {scenes.length > 0 && (
              <Region label="Scenes" className="sm:col-span-4">
                <HomeScenes scenes={scenes} />
              </Region>
            )}

            {cameras.length > 0 && (
              <Region label="Cameras" className="sm:col-span-6">
                <HomeCameras cameras={cameras} />
              </Region>
            )}
          </div>
        ) : (
          <p className="mt-6 border-t border-border pt-10 pb-6 text-center text-muted">
            Connect Home Assistant and your weather, alarm, calendar, scenes and
            cameras will appear here.
          </p>
        )}
      </div>

      <SystemPanel open={sysOpen} onClose={() => setSysOpen(false)} />
    </>
  );
}

function Region({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </h2>
      {children}
    </div>
  );
}
