// The glanceable landing screen: time, weather, security at-a-glance, scenes,
// and every room as a glass tile.

import { useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  DoorOpen,
  Lightbulb,
  Moon,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "@/store/store";
import { useEffectiveRegistry, useVisibleEntities } from "@/hooks/useVisibleEntities";
import { useClock } from "@/hooks/useClock";
import { callService } from "@/lib/ha";
import {
  ALARM_LABELS,
  buildRooms,
  capitalize,
  domainOf,
  friendlyName,
  isOn,
  openingSensors,
  resolveFeature,
} from "@/lib/entities";
import { ViewShell } from "@/views/ViewShell";

const WEATHER_ICONS: Record<string, LucideIcon> = {
  "clear-night": Moon,
  cloudy: Cloud,
  fog: CloudFog,
  hail: CloudSnow,
  lightning: CloudLightning,
  "lightning-rainy": CloudLightning,
  partlycloudy: CloudSun,
  pouring: CloudRain,
  rainy: CloudRain,
  snowy: CloudSnow,
  "snowy-rainy": CloudSnow,
  sunny: Sun,
  windy: Wind,
  "windy-variant": Wind,
};

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeView() {
  const entities = useVisibleEntities();
  const registry = useEffectiveRegistry();
  const hiddenAreas = useStore((s) => s.hiddenAreas);
  const navigate = useStore((s) => s.navigate);
  const now = useClock();

  const rooms = registry
    ? buildRooms(entities, registry).filter(
        (r) => !hiddenAreas.includes(r.area.area_id),
      )
    : [];
  const features = useStore((s) => s.features);
  const weather = resolveFeature(entities, features.weather, "weather");
  const alarm = resolveFeature(entities, features.alarm, "alarm_control_panel");
  const scenes = (features.scenes ?? [])
    .map((id) => entities[id])
    .filter(Boolean);
  // Glanceable status, pro-installer style: only devices you've added count.
  const assigned = registry?.entityArea ?? {};
  const lightsOn = Object.keys(assigned).filter(
    (id) => domainOf(id) === "light" && entities[id] && isOn(entities[id]),
  ).length;
  const doorsOpen = openingSensors(entities).filter(
    (e) => assigned[e.entity_id] && isOn(e),
  ).length;

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const meridiem = /([AP]M)$/i.exec(time)?.[1];
  const clock = meridiem ? time.slice(0, -meridiem.length).trim() : time;

  return (
    <ViewShell>
      <div className="gap-10 lg:grid lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-[minmax(280px,2fr)_3fr] lg:items-center">
        {/* Left: time + conditions */}
        <div className="mb-8 lg:mb-0">
          <div className="text-[17px] font-medium text-ink/55">
            {greeting(now.getHours())}
          </div>
          <div className="mt-1 whitespace-nowrap text-[clamp(4.5rem,10vw,7rem)] font-extralight leading-none tracking-tight tabular-nums">
            {clock}
            {meridiem && (
              <span className="ml-3 text-[0.32em] font-light text-ink/55">
                {meridiem}
              </span>
            )}
          </div>
          <div className="mt-2 text-[17px] text-ink/55">
            {now.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {weather && <WeatherChip entity={weather} />}
            {alarm && (
              <button
                onClick={() => navigate({ name: "security" })}
                className="glass-pill pressable flex items-center gap-2.5 px-5 py-3"
              >
                <AlarmGlyph state={alarm.state} />
                <span className="text-[15px] font-medium">
                  {ALARM_LABELS[alarm.state] ?? capitalize(alarm.state)}
                </span>
              </button>
            )}
            {lightsOn > 0 && (
              <span className="glass-pill flex items-center gap-2.5 px-5 py-3">
                <Lightbulb size={19} className="text-amber-500" />
                <span className="text-[15px] font-medium">
                  {lightsOn} {lightsOn === 1 ? "light" : "lights"} on
                </span>
              </span>
            )}
            {doorsOpen > 0 && (
              <button
                onClick={() => navigate({ name: "security" })}
                className="glass-pill pressable flex items-center gap-2.5 px-5 py-3"
              >
                <DoorOpen size={19} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[15px] font-medium">
                  {doorsOpen} {doorsOpen === 1 ? "door" : "doors"} open
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Right: scenes + rooms */}
        <div>
          {scenes.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2.5">
              {scenes.map((scene) => (
                <SceneChip key={scene.entity_id} entity={scene} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {rooms.map((room) => (
              <button
                key={room.area.area_id}
                onClick={() => navigate({ name: "room", areaId: room.area.area_id })}
                className="glass pressable flex min-h-[7rem] flex-col justify-between p-4 text-left"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="text-[17px] font-medium leading-snug">
                    {room.area.name}
                  </span>
                  {room.temperature && (
                    <span className="text-[15px] font-light text-ink/55">
                      {room.temperature}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[13px] text-ink/55">
                  {room.lightsOn > 0 ? (
                    <>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-300 text-amber-950">
                        <Lightbulb size={13} />
                      </span>
                      {room.lightsOn} {room.lightsOn === 1 ? "light" : "lights"} on
                    </>
                  ) : (
                    <span>
                      {room.devices.length}{" "}
                      {room.devices.length === 1 ? "device" : "devices"}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {registry && rooms.length === 0 && (
            <div className="glass-soft p-8 text-center text-ink/55">
              Nothing here yet. Open Settings, create your rooms, and add the
              devices you want on this dashboard.
            </div>
          )}
        </div>
      </div>
    </ViewShell>
  );
}

function AlarmGlyph({ state }: { state: string }) {
  if (state === "triggered" || state === "pending")
    return <ShieldAlert size={19} className="animate-pulse-alert text-red-500" />;
  if (state.startsWith("armed"))
    return <ShieldCheck size={19} className="text-emerald-600 dark:text-emerald-400" />;
  return <ShieldOff size={19} className="text-ink/55" />;
}

function WeatherChip({ entity }: { entity: HassEntity }) {
  const Icon = WEATHER_ICONS[entity.state] ?? Cloud;
  const temp = entity.attributes.temperature as number | undefined;
  const unit = (entity.attributes.temperature_unit as string | undefined) ?? "°";
  return (
    <span className="glass-pill flex items-center gap-2.5 px-5 py-3">
      <Icon size={19} className="text-ink/70" />
      <span className="text-[15px] font-medium">
        {temp != null ? `${Math.round(temp)}${unit}` : capitalize(entity.state)}
      </span>
    </span>
  );
}

function SceneChip({ entity }: { entity: HassEntity }) {
  const [fired, setFired] = useState(false);
  return (
    <button
      onClick={() => {
        void callService("scene", "turn_on", undefined, entity.entity_id);
        setFired(true);
        window.setTimeout(() => setFired(false), 1200);
      }}
      className={`pressable flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors duration-200 ${
        fired ? "bg-ink text-ink-contrast" : "glass-pill text-ink/80"
      }`}
    >
      <Sparkles size={15} />
      {friendlyName(entity)}
    </button>
  );
}
