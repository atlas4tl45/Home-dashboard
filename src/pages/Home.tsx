import { useMemo } from "react";
import { GreetingHeader } from "@/components/GreetingHeader";
import { EntityCard } from "@/components/cards/EntityCard";
import { useStore } from "@/store/useStore";
import { domainOf, friendlyName } from "@/lib/entities";
import type { HassEntity } from "@/types";

export function Home() {
  const entities = useStore((s) => s.entities);

  const groups = useMemo(() => {
    const byDomain: Record<string, HassEntity[]> = {
      alarm_control_panel: [],
      camera: [],
      scene: [],
      media_player: [],
    };
    for (const e of Object.values(entities)) {
      const d = domainOf(e.entity_id);
      if (d in byDomain) byDomain[d].push(e);
    }
    for (const list of Object.values(byDomain)) {
      list.sort((a, b) => friendlyName(a).localeCompare(friendlyName(b)));
    }
    return byDomain;
  }, [entities]);

  const hasAny =
    groups.alarm_control_panel.length +
      groups.camera.length +
      groups.scene.length +
      groups.media_player.length >
    0;

  return (
    <>
      <GreetingHeader />

      <Section title="Alarm" items={groups.alarm_control_panel} wide />
      <Section title="Cameras" items={groups.camera} wide />
      <Section title="Scenes" items={groups.scene} />
      <Section title="Music" items={groups.media_player} wide />

      {!hasAny && (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-medium">Nothing to show here yet</p>
          <p className="text-sm text-muted">
            Alarm, cameras, scenes and media players from Home Assistant will
            appear here automatically.
          </p>
        </div>
      )}
    </>
  );
}

/**
 * A home section. `wide` sections use a grid whose columns are half-width so
 * the col-span-2 camera/media cards land two-per-row on larger screens.
 */
function Section({
  title,
  items,
  wide,
}: {
  title: string;
  items: HassEntity[];
  wide?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div
        className={
          wide
            ? "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        }
      >
        {items.map((e) => (
          <EntityCard key={e.entity_id} item={{ entity_id: e.entity_id }} />
        ))}
      </div>
    </section>
  );
}
