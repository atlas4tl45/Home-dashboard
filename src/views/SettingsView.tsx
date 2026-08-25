// Settings: connection, appearance, and this tablet's own room + device
// setup. Rooms can be created and edited right here — Home Assistant areas
// appear automatically when they exist, but aren't required.

import { useMemo, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  ChevronDown,
  Eye,
  EyeOff,
  LogOut,
  Moon,
  Pencil,
  Plus,
  RotateCw,
  Sun,
  SunMoon,
  Trash2,
} from "lucide-react";
import { isCustomRoomId, useStore } from "@/store/store";
import { useEffectiveRegistry } from "@/hooks/useVisibleEntities";
import { buildRooms, friendlyName, isDisplayable } from "@/lib/entities";
import { normalizeUrl } from "@/lib/ha";
import type { Theme } from "@/lib/types";
import { RoomEditor } from "@/components/RoomEditor";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "auto", label: "Auto", icon: SunMoon },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function SettingsView() {
  const creds = useStore((s) => s.creds);
  const status = useStore((s) => s.status);
  const entities = useStore((s) => s.entities);
  const registry = useEffectiveRegistry();
  const hiddenAreas = useStore((s) => s.hiddenAreas);
  const hiddenEntities = useStore((s) => s.hiddenEntities);
  const toggleAreaHidden = useStore((s) => s.toggleAreaHidden);
  const toggleEntityHidden = useStore((s) => s.toggleEntityHidden);
  const addRoom = useStore((s) => s.addRoom);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const reconnect = useStore((s) => s.reconnect);
  const signOut = useStore((s) => s.signOut);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Room rows: tablet rooms always listed; HA areas only when they hold devices.
  const roomInfo = useMemo(
    () =>
      registry
        ? new Map(buildRooms(entities, registry).map((r) => [r.area.area_id, r]))
        : new Map<string, ReturnType<typeof buildRooms>[number]>(),
    [entities, registry],
  );
  const roomRows = useMemo(() => {
    if (!registry) return [];
    return [
      ...registry.areas.filter((a) => isCustomRoomId(a.area_id)),
      ...registry.areas.filter(
        (a) => !isCustomRoomId(a.area_id) && roomInfo.has(a.area_id),
      ),
    ];
  }, [registry, roomInfo]);

  // Visibility groups: everything the dashboard can show, by room.
  const groups = useMemo(() => {
    if (!registry) return [];
    const byArea = new Map<string, HassEntity[]>();
    const wholeHome: HassEntity[] = [];
    for (const entity of Object.values(entities)) {
      if (!isDisplayable(entity)) continue;
      if (registry.hiddenEntities.has(entity.entity_id)) continue;
      const areaId = registry.entityArea[entity.entity_id];
      if (!areaId) {
        wholeHome.push(entity);
        continue;
      }
      const list = byArea.get(areaId);
      if (list) list.push(entity);
      else byArea.set(areaId, [entity]);
    }
    const byName = (a: HassEntity, b: HassEntity) =>
      friendlyName(a).localeCompare(friendlyName(b));
    const result = registry.areas
      .map((a) => ({
        id: a.area_id,
        name: a.name,
        items: (byArea.get(a.area_id) ?? []).sort(byName),
      }))
      .filter((g) => g.items.length > 0);
    if (wholeHome.length > 0)
      result.push({ id: "_home", name: "Whole home", items: wholeHome.sort(byName) });
    return result;
  }, [entities, registry]);

  return (
    <ViewShell>
      <ViewHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Home Assistant</h2>
          <p className="flex items-center gap-2 text-[15px] text-ink/55">
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected" ? "bg-emerald-500" : "bg-red-400"
              }`}
            />
            {creds ? normalizeUrl(creds.url) : "Not connected"}
            <span className="text-ink/45">
              · {Object.keys(entities).length} entities
            </span>
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => void reconnect()}
              className="glass-pill pressable flex h-12 items-center gap-2 px-5 text-[14px] font-medium"
            >
              <RotateCw size={16} /> Reconnect
            </button>
            <button
              onClick={signOut}
              className="pressable flex h-12 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 text-[14px] font-medium text-red-600 dark:text-red-400"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Appearance</h2>
          <p className="mb-4 text-[14px] text-ink/55">
            Auto follows the tablet's light/dark setting.
          </p>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-medium ${
                  theme === value
                    ? "bg-ink text-ink-contrast"
                    : "bg-ink/[0.06] text-ink/70"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Rooms</h2>
          <p className="mb-4 text-[14px] text-ink/55">
            Create rooms and assign devices to them right here. Home Assistant
            areas show up automatically when you use them.
          </p>
          <div className="space-y-1">
            {roomRows.map((area) => {
              const custom = isCustomRoomId(area.area_id);
              const room = roomInfo.get(area.area_id);
              const count = room ? room.devices.length + room.cameras.length : 0;
              const hidden = hiddenAreas.includes(area.area_id);
              return (
                <div
                  key={area.area_id}
                  className="flex items-center gap-1 rounded-2xl px-3 py-2 hover:bg-ink/[0.04]"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[15px] ${hidden ? "text-ink/45" : ""}`}
                    >
                      {area.name}
                    </span>
                    <span className="block text-[12px] text-ink/45">
                      {count} {count === 1 ? "device" : "devices"}
                      {custom ? "" : " · Home Assistant area"}
                    </span>
                  </span>
                  {custom && (
                    <>
                      <IconButton
                        label={`Edit ${area.name}`}
                        onClick={() => setEditingRoom(area.area_id)}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${area.name}`}
                        onClick={() => deleteRoom(area.area_id)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    label={hidden ? `Show ${area.name}` : `Hide ${area.name}`}
                    onClick={() => toggleAreaHidden(area.area_id)}
                  >
                    {hidden ? (
                      <EyeOff size={16} className="text-ink/30" />
                    ) : (
                      <Eye size={16} />
                    )}
                  </IconButton>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setEditingRoom(addRoom("New room"))}
            className="glass-pill pressable mt-3 flex h-12 items-center gap-2 px-5 text-[14px] font-medium"
          >
            <Plus size={16} /> Add room
          </button>
        </section>

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Devices</h2>
          <p className="mb-4 text-[14px] text-ink/55">
            Choose what appears on this tablet. Hidden devices stay available
            in Home Assistant.
          </p>
          <div className="space-y-1">
            {groups.map((group) => {
              const open = openGroup === group.id;
              const hiddenCount = group.items.filter((e) =>
                hiddenEntities.includes(e.entity_id),
              ).length;
              return (
                <div key={group.id}>
                  <button
                    onClick={() => setOpenGroup(open ? null : group.id)}
                    className="pressable flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-ink/[0.04]"
                  >
                    <span className="text-[15px] font-medium">{group.name}</span>
                    <span className="flex items-center gap-2 text-[12px] text-ink/45">
                      {hiddenCount > 0 && `${hiddenCount} hidden`}
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                  {open && (
                    <div className="mb-2 space-y-0.5 pl-2">
                      {group.items.map((entity) => {
                        const hidden = hiddenEntities.includes(entity.entity_id);
                        return (
                          <button
                            key={entity.entity_id}
                            onClick={() => toggleEntityHidden(entity.entity_id)}
                            className="pressable flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-ink/[0.04]"
                          >
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-[15px] ${hidden ? "text-ink/45" : ""}`}
                              >
                                {friendlyName(entity)}
                              </span>
                              <span className="block truncate text-[12px] text-ink/45">
                                {entity.entity_id}
                              </span>
                            </span>
                            {hidden ? (
                              <EyeOff size={16} className="shrink-0 text-ink/30" />
                            ) : (
                              <Eye size={16} className="shrink-0 text-ink/55" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass-soft p-6 text-[14px] leading-relaxed text-ink/55">
          <h2 className="mb-1 text-[15px] font-semibold text-ink/70">
            Wall-tablet tips
          </h2>
          <p>
            Add this page to your iPad home screen (Share → Add to Home Screen)
            for a full-screen app. Kiosk launchers can auto-connect by opening{" "}
            <span className="text-ink/70">
              ?url=&lt;address&gt;&amp;token=&lt;token&gt;
            </span>
            . In iPadOS, use Guided Access to pin the dashboard on the wall.
          </p>
        </section>
      </div>

      {editingRoom && (
        <RoomEditor roomId={editingRoom} onClose={() => setEditingRoom(null)} />
      )}
    </ViewShell>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink/55 hover:bg-ink/[0.06]"
    >
      {children}
    </button>
  );
}
