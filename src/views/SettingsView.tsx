// Settings: connection, appearance, and the dashboard's curated setup.
// Everything is opt-in — rooms are created here, devices are added to them
// by search, and whole-home features (alarm, weather, scenes) are explicit
// picks. Home Assistant areas only ever appear as hints in the search.

import { useMemo, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  ChevronDown,
  ChevronRight,
  CloudSun,
  Eye,
  EyeOff,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Monitor,
  Radar,
  Download,
  RefreshCw,
  RotateCw,
  Shield,
  Sparkles,
  Home,
  KeyRound,
  Lock,
  LockOpen,
  Sun,
  SunMoon,
  Trash2,
} from "lucide-react";
import { useStore } from "@/store/store";
import {
  useEffectiveRegistry,
  useNamedEntities,
} from "@/hooks/useVisibleEntities";
import {
  buildRooms,
  friendlyName,
  isDisplayable,
  resolveFeature,
} from "@/lib/entities";
import { callService, normalizeUrl } from "@/lib/ha";
import { SECRET_TAPS, type Theme } from "@/lib/types";
import {
  fetchDeployedVersion,
  reloadWithVersion,
} from "@/hooks/useVersionWatcher";
import { RoomEditor } from "@/components/RoomEditor";
import { RenameSheet } from "@/components/RenameSheet";
import { SetPinSheet } from "@/components/SetPinSheet";
import { EntityPickerSheet } from "@/components/EntityPickerSheet";
import { ViewHeader, ViewShell } from "@/views/ViewShell";

const FEATURES: {
  key: "alarm" | "weather" | "radar";
  label: string;
  domain: string;
  icon: typeof Shield;
}[] = [
  { key: "alarm", label: "Alarm system", domain: "alarm_control_panel", icon: Shield },
  { key: "weather", label: "Weather", domain: "weather", icon: CloudSun },
  { key: "radar", label: "Weather radar", domain: "camera", icon: Radar },
];

const RETURN_HOME_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 60_000, label: "1 min" },
  { value: 120_000, label: "2 min" },
  { value: 300_000, label: "5 min" },
];

const SCREENSAVER_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 300_000, label: "5 min" },
  { value: 600_000, label: "10 min" },
  { value: 1_800_000, label: "30 min" },
];

/** shell_command.<name> that pulls the newest build (see homeassistant/README.md). */
const UPDATE_SERVICE = "glasshome_update";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "auto", label: "Auto", icon: SunMoon },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function SettingsView() {
  const creds = useStore((s) => s.creds);
  const status = useStore((s) => s.status);
  const entities = useNamedEntities();
  const registry = useEffectiveRegistry();
  const hiddenAreas = useStore((s) => s.hiddenAreas);
  const hiddenEntities = useStore((s) => s.hiddenEntities);
  const entityNames = useStore((s) => s.entityNames);
  const toggleAreaHidden = useStore((s) => s.toggleAreaHidden);
  const toggleEntityHidden = useStore((s) => s.toggleEntityHidden);
  const addRoom = useStore((s) => s.addRoom);
  const features = useStore((s) => s.features);
  const setFeature = useStore((s) => s.setFeature);
  const toggleSceneShown = useStore((s) => s.toggleSceneShown);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const reconnect = useStore((s) => s.reconnect);
  const signOut = useStore((s) => s.signOut);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const kiosk = useStore((s) => s.kiosk);
  const setKiosk = useStore((s) => s.setKiosk);

  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [pickingFeature, setPickingFeature] = useState<
    (typeof FEATURES)[number] | null
  >(null);
  const [pickingScenes, setPickingScenes] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [settingPin, setSettingPin] = useState(false);
  const [busy, setBusy] = useState<null | "checking" | "updating">(null);
  const [updateNote, setUpdateNote] = useState<string | null>(null);

  /** Reload if Home Assistant is now serving a different build. */
  async function takeNewBuild(attempts = 1): Promise<string | null> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const deployed = await fetchDeployedVersion();
      if (deployed && deployed !== __BUILD_ID__) {
        reloadWithVersion(deployed);
        return deployed;
      }
      if (attempt < attempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
    }
    return null;
  }

  async function checkForUpdate() {
    setBusy("checking");
    setUpdateNote(null);
    const deployed = await fetchDeployedVersion();
    if (deployed && deployed !== __BUILD_ID__) {
      reloadWithVersion(deployed);
      return;
    }
    setBusy(null);
    setUpdateNote(
      deployed
        ? `Home Assistant is serving this same build (${deployed}).`
        : "Couldn't read version.json from Home Assistant, so there's nothing to compare against.",
    );
  }

  /**
   * Ask Home Assistant to pull the newest build from GitHub, then load it.
   * Needs the shell_command from homeassistant/README.md.
   */
  async function updateNow() {
    setBusy("updating");
    setUpdateNote("Asking Home Assistant to fetch the latest build…");
    try {
      await callService("shell_command", UPDATE_SERVICE);
    } catch (err) {
      setBusy(null);
      const detail =
        err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
      setUpdateNote(
        `Couldn't run shell_command.${UPDATE_SERVICE} (${detail}). Add it to configuration.yaml — see homeassistant/README.md in the repo.`,
      );
      return;
    }
    setUpdateNote("Home Assistant finished. Looking for the new build…");
    // The files land a moment after the command returns.
    const deployed = await takeNewBuild(5);
    if (deployed) return; // reloading
    setBusy(null);
    setUpdateNote(`Already on the latest build (${__BUILD_ID__}).`);
  }

  // Every room is created on the tablet; list them all, even empty ones.
  const roomInfo = useMemo(
    () =>
      registry
        ? new Map(buildRooms(entities, registry).map((r) => [r.area.area_id, r]))
        : new Map<string, ReturnType<typeof buildRooms>[number]>(),
    [entities, registry],
  );
  const roomRows = registry?.areas ?? [];

  // Visibility groups: the devices you've added, by room. (Unadded entities
  // aren't on the dashboard, so there's nothing to hide.)
  const groups = useMemo(() => {
    if (!registry) return [];
    const byArea = new Map<string, HassEntity[]>();
    for (const entity of Object.values(entities)) {
      if (!isDisplayable(entity)) continue;
      const areaId = registry.entityArea[entity.entity_id];
      if (!areaId) continue;
      const list = byArea.get(areaId);
      if (list) list.push(entity);
      else byArea.set(areaId, [entity]);
    }
    const byName = (a: HassEntity, b: HassEntity) =>
      friendlyName(a).localeCompare(friendlyName(b));
    return registry.areas
      .map((a) => ({
        id: a.area_id,
        name: a.name,
        items: (byArea.get(a.area_id) ?? []).sort(byName),
      }))
      .filter((g) => g.items.length > 0);
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
          <h2 className="mb-1 text-[17px] font-semibold">When idle</h2>
          <p className="mb-4 text-[14px] text-ink/55">
            Neither happens while you're watching a camera full screen.
          </p>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[14px] text-ink/70">
                <Home size={15} /> Return to the home screen
              </div>
              <SegmentedControl
                options={RETURN_HOME_OPTIONS}
                value={kiosk.returnHomeMs}
                onChange={(returnHomeMs) => setKiosk({ returnHomeMs })}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-[14px] text-ink/70">
                <Monitor size={15} /> Dim to a clock screensaver
              </div>
              <SegmentedControl
                options={SCREENSAVER_OPTIONS}
                value={kiosk.screensaverMs}
                onChange={(screensaverMs) => setKiosk({ screensaverMs })}
              />
            </div>
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Settings access</h2>
          <p className="mb-4 text-[14px] leading-relaxed text-ink/55">
            Hiding Settings removes it from the dock. To get back here, tap
            the clock {SECRET_TAPS} times quickly — on the home screen or any
            page header.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setKiosk({ hideSettings: false })}
              className={`pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-medium ${
                kiosk.hideSettings
                  ? "bg-ink/[0.06] text-ink/70"
                  : "bg-ink text-ink-contrast"
              }`}
            >
              <LockOpen size={16} /> In the dock
            </button>
            <button
              onClick={() => setKiosk({ hideSettings: true })}
              className={`pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-medium ${
                kiosk.hideSettings
                  ? "bg-ink text-ink-contrast"
                  : "bg-ink/[0.06] text-ink/70"
              }`}
            >
              <Lock size={16} /> Hidden
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setSettingPin(true)}
              className="glass-pill pressable flex h-12 items-center gap-2 px-5 text-[14px] font-medium"
            >
              <KeyRound size={16} />
              {kiosk.pin ? "Change PIN" : "Require a PIN"}
            </button>
            {kiosk.pin && (
              <button
                onClick={() => setKiosk({ pin: null })}
                className="pressable flex h-12 items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 text-[14px] font-medium text-red-600 dark:text-red-400"
              >
                Remove PIN
              </button>
            )}
            <span className="text-[13px] text-ink/45">
              {kiosk.pin ? "A PIN is required to open Settings." : "No PIN set."}
            </span>
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Home features</h2>
          <p className="mb-3 text-[14px] text-ink/55">
            Pick which entity powers each whole-home feature.
          </p>
          <div className="space-y-1">
            {FEATURES.map((feature) => {
              const selection = features[feature.key];
              const resolved = resolveFeature(
                entities,
                selection,
                feature.domain,
              );
              const Icon = feature.icon;
              const detail =
                !selection || selection === "none"
                  ? "Off"
                  : selection === "auto"
                    ? resolved
                      ? `Automatic · ${friendlyName(resolved)}`
                      : "Automatic · none found"
                    : resolved
                      ? friendlyName(resolved)
                      : `${selection} (not found)`;
              return (
                <button
                  key={feature.key}
                  onClick={() => setPickingFeature(feature)}
                  className="pressable flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-ink/[0.04]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/55">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">{feature.label}</span>
                    <span
                      className={`block truncate text-[12px] ${
                        selection === "none" ? "text-ink/45" : "text-ink/55"
                      }`}
                    >
                      {detail}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink/30" />
                </button>
              );
            })}
            <button
              onClick={() => setPickingScenes(true)}
              className="pressable flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-ink/[0.04]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-ink/55">
                <Sparkles size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">Scenes</span>
                <span className="block truncate text-[12px] text-ink/55">
                  {(features.scenes?.length ?? 0) > 0
                    ? `${features.scenes!.length} on the home screen`
                    : "None"}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink/30" />
            </button>
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Rooms</h2>
          <p className="mb-4 text-[14px] text-ink/55">
            The dashboard shows only what you add. Create a room, then use the
            pencil to search your Home Assistant entities and add them to it.
            Everything is saved to your Home Assistant profile, so kiosks and
            new tablets pick it up on connect.
          </p>
          <div className="space-y-1">
            {roomRows.map((area) => {
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
                    </span>
                  </span>
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

        {groups.length > 0 && (
        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Devices</h2>
          <p className="mb-4 text-[14px] text-ink/55">
            Rename a device to whatever you call it, or hide it without
            removing it from its room.
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
                        const renamed = entityNames[entity.entity_id] != null;
                        return (
                          <div
                            key={entity.entity_id}
                            className="flex items-center gap-1 rounded-2xl px-3 py-2 hover:bg-ink/[0.04]"
                          >
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-[15px] ${hidden ? "text-ink/45" : ""}`}
                              >
                                {friendlyName(entity)}
                              </span>
                              <span className="block truncate text-[12px] text-ink/45">
                                {renamed ? "Renamed · " : ""}
                                {entity.entity_id}
                              </span>
                            </span>
                            <IconButton
                              label={`Rename ${friendlyName(entity)}`}
                              onClick={() => setRenaming(entity.entity_id)}
                            >
                              <Pencil size={16} />
                            </IconButton>
                            <IconButton
                              label={
                                hidden
                                  ? `Show ${friendlyName(entity)}`
                                  : `Hide ${friendlyName(entity)}`
                              }
                              onClick={() => toggleEntityHidden(entity.entity_id)}
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
                  )}
                </div>
              );
            })}
          </div>
        </section>
        )}

        <section className="glass p-6">
          <h2 className="mb-1 text-[17px] font-semibold">Dashboard version</h2>
          <p className="mb-4 text-[14px] leading-relaxed text-ink/55">
            Running build{" "}
            <span className="tabular-nums text-ink/70">{__BUILD_ID__}</span>.
            <span className="mt-1 block">
              <span className="text-ink/70">Update now</span> asks Home
              Assistant to fetch the latest build from GitHub and then loads
              it. It also happens on its own, on Home Assistant's schedule.
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void updateNow()}
              disabled={busy !== null || status !== "connected"}
              className="pressable flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-ink-contrast disabled:opacity-40"
            >
              <Download
                size={16}
                className={busy === "updating" ? "animate-pulse" : ""}
              />
              {busy === "updating" ? "Updating…" : "Update now"}
            </button>
            <button
              onClick={() => void checkForUpdate()}
              disabled={busy !== null}
              className="glass-pill pressable flex h-12 items-center gap-2 px-5 text-[14px] font-medium disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={busy === "checking" ? "animate-spin" : ""}
              />
              {busy === "checking" ? "Checking…" : "Check for updates"}
            </button>
            <button
              onClick={() => reloadWithVersion(String(Date.now()))}
              className="glass-pill pressable flex h-12 items-center gap-2 px-5 text-[14px] font-medium"
            >
              <RotateCw size={16} /> Force reload
            </button>
          </div>
          {updateNote && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
              {updateNote}
            </p>
          )}
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
      {pickingFeature && (
        <EntityPickerSheet
          title={pickingFeature.label}
          domain={pickingFeature.domain}
          selection={features[pickingFeature.key]}
          onPick={(value) => setFeature(pickingFeature.key, value)}
          onClose={() => setPickingFeature(null)}
        />
      )}
      {settingPin && <SetPinSheet onClose={() => setSettingPin(false)} />}
      {renaming && (
        <RenameSheet entityId={renaming} onClose={() => setRenaming(null)} />
      )}
      {pickingScenes && (
        <EntityPickerSheet
          multi
          title="Scenes"
          domain="scene"
          selections={features.scenes ?? []}
          onToggle={toggleSceneShown}
          onClose={() => setPickingScenes(false)}
        />
      )}
    </ViewShell>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`pressable h-11 flex-1 rounded-full text-[14px] font-medium ${
            value === option.value
              ? "bg-ink text-ink-contrast"
              : "bg-ink/[0.06] text-ink/70"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
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
