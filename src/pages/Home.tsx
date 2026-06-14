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

  const hasMid = alarms.length > 0 || scenes.length > 0 || calendarIds.length > 0;
  const hasAny = hasMid || forecast.length > 0 || cameras.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <GreetingHeader onReveal={() => setSysOpen(true)} />
      <SystemPanel open={sysOpen} onClose={() => setSysOpen(false)} />

      {forecast.length > 0 && (
        <Zone label="Forecast">
          <WeatherForecast days={forecast} unit={unit} />
        </Zone>
      )}

      {hasMid && (
        <Zone>
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-3">
            <div className="flex flex-col gap-8 lg:col-span-2">
              {alarms.length > 0 && (
                <Block label="Security">
                  <HomeSecurity alarms={alarms} />
                </Block>
              )}
              {scenes.length > 0 && (
                <Block label="Scenes">
                  <HomeScenes scenes={scenes} />
                </Block>
              )}
            </div>
            {calendarIds.length > 0 && (
              <div className="lg:border-l lg:border-border/60 lg:pl-10">
                <Block label="Up next">
                  <CalendarPanel events={events} />
                </Block>
              </div>
            )}
          </div>
        </Zone>
      )}

      {cameras.length > 0 && (
        <Zone label="Cameras">
          <HomeCameras cameras={cameras} />
        </Zone>
      )}

      {!hasAny && (
        <p className="py-16 text-center text-muted">
          Connect Home Assistant and your alarm, weather, calendar, scenes and
          cameras will appear here.
        </p>
      )}
    </div>
  );
}

/** A top-level zone separated from the previous one by a hairline rule. */
function Zone({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/60 pt-8">
      {label && <Label>{label}</Label>}
      {children}
    </section>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </h2>
  );
}
