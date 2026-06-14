import { useMemo, useState } from "react";
import { GreetingHeader } from "@/components/GreetingHeader";
import { HomeScenes } from "@/components/home/HomeScenes";
import { HomeSecurity } from "@/components/home/HomeSecurity";
import { HomeCameras } from "@/components/home/HomeCameras";
import { HomeMusic } from "@/components/home/HomeMusic";
import { SystemPanel } from "@/components/SystemPanel";
import { useStore } from "@/store/useStore";
import { domainOf, friendlyName } from "@/lib/entities";
import type { HassEntity } from "@/types";

export function Home() {
  const entities = useStore((s) => s.entities);
  const [sysOpen, setSysOpen] = useState(false);

  const { alarms, cameras, scenes, players } = useMemo(() => {
    const g = {
      alarms: [] as HassEntity[],
      cameras: [] as HassEntity[],
      scenes: [] as HassEntity[],
      players: [] as HassEntity[],
    };
    for (const e of Object.values(entities)) {
      switch (domainOf(e.entity_id)) {
        case "alarm_control_panel":
          g.alarms.push(e);
          break;
        case "camera":
          g.cameras.push(e);
          break;
        case "scene":
          g.scenes.push(e);
          break;
        case "media_player":
          g.players.push(e);
          break;
      }
    }
    const byName = (a: HassEntity, b: HassEntity) =>
      friendlyName(a).localeCompare(friendlyName(b));
    g.alarms.sort(byName);
    g.cameras.sort(byName);
    g.scenes.sort(byName);
    // Active players first.
    g.players.sort((a, b) => {
      const score = (e: HassEntity) => (e.state === "playing" ? 0 : e.state === "paused" ? 1 : 2);
      return score(a) - score(b) || byName(a, b);
    });
    return g;
  }, [entities]);

  const hasMiddle = cameras.length > 0 || alarms.length > 0;
  const hasAny = hasMiddle || scenes.length > 0 || players.length > 0;

  return (
    <>
      <GreetingHeader onReveal={() => setSysOpen(true)} />
      <SystemPanel open={sysOpen} onClose={() => setSysOpen(false)} />

      {scenes.length > 0 && (
        <section className="mb-8">
          <HomeScenes scenes={scenes} />
        </section>
      )}

      {hasMiddle && (
        <div className="mb-8 grid gap-8 lg:grid-cols-3">
          {cameras.length > 0 && (
            <section className={alarms.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
              <HomeCameras cameras={cameras} />
            </section>
          )}
          {alarms.length > 0 && (
            <section className={cameras.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}>
              <HomeSecurity alarms={alarms} />
            </section>
          )}
        </div>
      )}

      {players.length > 0 && (
        <section className="mb-2">
          <HomeMusic players={players} />
        </section>
      )}

      {!hasAny && (
        <div className="rounded-3xl bg-surface-2 px-6 py-16 text-center">
          <p className="font-medium">Your home at a glance</p>
          <p className="mt-1 text-sm text-muted">
            Alarm, cameras, scenes and music from Home Assistant will appear here
            automatically.
          </p>
        </div>
      )}
    </>
  );
}
