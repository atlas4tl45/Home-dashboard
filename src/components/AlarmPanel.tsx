// Alarm control.
//
// Works with a plain Home Assistant alarm panel, and understands Alarmo's
// extras when the entity comes from that integration: the sensors that are
// blocking arming (with a bypass), live exit/entry countdowns with a way to
// skip the exit delay, and which sensors ended up bypassed.

import { useEffect, useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  DoorOpen,
  Loader2,
  Moon,
  Palmtree,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { callService } from "@/lib/ha";
import {
  ALARM_LABELS,
  friendlyName,
  isUnavailable,
  stateLabel,
} from "@/lib/entities";
import { usePendingAction } from "@/hooks/usePendingAction";
import { useTick } from "@/hooks/useTick";
import { useNamedEntities } from "@/hooks/useVisibleEntities";
import { useStore } from "@/store/store";
import { Keypad, PinDots } from "@/components/Keypad";

type AlarmAction = "disarm" | "home" | "away" | "night" | "vacation";

const ACTION_LABELS: Record<AlarmAction, string> = {
  disarm: "Disarm",
  home: "Arm Home",
  away: "Arm Away",
  night: "Arm Night",
  vacation: "Arm Vacation",
};

const TARGET_STATE: Record<AlarmAction, string> = {
  disarm: "disarmed",
  home: "armed_home",
  away: "armed_away",
  night: "armed_night",
  vacation: "armed_vacation",
};

/** Standard alarm_control_panel service for each action. */
const HA_SERVICE: Record<AlarmAction, string> = {
  disarm: "alarm_disarm",
  home: "alarm_arm_home",
  away: "alarm_arm_away",
  night: "alarm_arm_night",
  vacation: "alarm_arm_vacation",
};

// AlarmControlPanelEntityFeature bits.
const FEATURE_BITS: [number, AlarmAction][] = [
  [1, "home"],
  [2, "away"],
  [4, "night"],
  [16, "vacation"],
];

export function AlarmPanel({ entity }: { entity: HassEntity }) {
  const entities = useNamedEntities();
  const registry = useStore((s) => s.registry);
  const isAlarmo = registry?.entityPlatform[entity.entity_id] === "alarmo";

  const [codeFor, setCodeFor] = useState<{
    action: AlarmAction;
    force: boolean;
  } | null>(null);
  const [code, setCode] = useState("");
  const [sentAction, setSentAction] = useState<AlarmAction | null>(null);
  const [dismissedOpen, setDismissedOpen] = useState(false);
  const {
    working,
    pending: inFlight,
    timedOut,
    begin,
    cancel,
  } = usePendingAction(entity, { timeoutMs: 120_000 });

  const state = entity.state;
  const armed = state.startsWith("armed");
  const triggered = state === "triggered";
  const pendingEntry = state === "pending"; // entry delay running
  const arming = state === "arming"; // exit delay running
  const codeFormat = entity.attributes.code_format as string | undefined;
  const codeArmRequired = (entity.attributes.code_arm_required as boolean) ?? true;

  // Alarmo extras (absent on a plain panel).
  const openSensors = (entity.attributes.open_sensors ?? null) as Record<
    string,
    string
  > | null;
  const bypassed = (entity.attributes.bypassed_sensors ?? null) as
    | string[]
    | null;
  const delaySeconds = entity.attributes.delay as number | undefined;

  // Countdown for exit/entry delays.
  const counting = (arming || pendingEntry) && !!delaySeconds;
  const now = useTick(counting);
  const remaining = counting
    ? Math.max(
        0,
        Math.ceil(
          (new Date(entity.last_changed).getTime() +
            delaySeconds! * 1000 -
            now) /
            1000,
        ),
      )
    : null;

  const blockingSensors = Object.keys(openSensors ?? {});
  const blocked = blockingSensors.length > 0 && !armed && !dismissedOpen;

  // Alarmo reverts to the previous state when sensors block arming, so stop
  // waiting on a transition that is never coming.
  useEffect(() => {
    if (blockingSensors.length > 0) cancel();
  }, [blockingSensors.length, cancel]);

  // Nothing left to dismiss once the panel reports everything closed.
  useEffect(() => {
    if (blockingSensors.length === 0) setDismissedOpen(false);
  }, [blockingSensors.length]);

  function run(action: AlarmAction, withCode?: string, force = false) {
    setSentAction(action);
    begin((e) => e.state === TARGET_STATE[action]);
    const call = isAlarmo
      ? callService(
          "alarmo",
          action === "disarm" ? "disarm" : "arm",
          {
            entity_id: entity.entity_id,
            ...(action === "disarm" ? {} : { mode: action, force }),
            ...(withCode ? { code: withCode } : {}),
          },
        )
      : callService(
          "alarm_control_panel",
          HA_SERVICE[action],
          withCode ? { code: withCode } : undefined,
          entity.entity_id,
        );
    call.catch(cancel);
    setCodeFor(null);
    setCode("");
    // A new attempt gets to report its own blockers.
    setDismissedOpen(false);
  }

  function request(action: AlarmAction, force = false) {
    const needsCode =
      codeFormat != null && (action === "disarm" || codeArmRequired);
    if (needsCode) {
      setCodeFor({ action, force });
      setCode("");
    } else {
      run(action, undefined, force);
    }
  }

  const features = (entity.attributes.supported_features as number) ?? 3;
  const actions: AlarmAction[] = armed
    ? ["disarm"]
    : FEATURE_BITS.filter(([bit]) => (features & bit) !== 0).map(
        ([, action]) => action,
      );

  const transitioning = arming || state === "disarming";
  const busy = (working || transitioning) && !blocked;

  const StateIcon = busy
    ? Loader2
    : timedOut
      ? TriangleAlert
      : triggered || pendingEntry
        ? ShieldAlert
        : armed
          ? ShieldCheck
          : blocked
            ? DoorOpen
            : ShieldOff;

  const tone =
    triggered || pendingEntry
      ? "bg-red-500 text-white"
      : busy
        ? "bg-ink/[0.06] text-ink/70"
        : timedOut || blocked
          ? "bg-amber-400 text-amber-950"
          : armed
            ? "bg-emerald-600 text-white"
            : "bg-ink/[0.06] text-ink/70";

  const headline = pendingEntry
    ? "Disarm now"
    : arming
      ? "Arming…"
      : blocked
        ? "Can't arm yet"
        : busy
          ? sentAction === "disarm"
            ? "Disarming…"
            : "Arming…"
          : timedOut
            ? "No response"
            : (ALARM_LABELS[state] ?? state.replace(/_/g, " "));

  const subline = counting
    ? `${remaining}s`
    : blocked
      ? `${blockingSensors.length} ${blockingSensors.length === 1 ? "sensor is" : "sensors are"} open`
      : busy
        ? "Waiting for the panel"
        : armed && bypassed && bypassed.length > 0
          ? `${bypassed.length} bypassed`
          : "Security system";

  return (
    <div
      className={`glass p-6 ${isUnavailable(entity) ? "opacity-40" : ""} ${
        triggered || pendingEntry
          ? "border-red-500/30 bg-red-400/15"
          : blocked
            ? "border-amber-500/30"
            : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${tone} ${
            (triggered || pendingEntry) && !busy ? "animate-pulse-alert" : ""
          }`}
        >
          <StateIcon size={28} className={busy ? "animate-spin" : ""} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold">{headline}</div>
          <div className="text-sm text-ink/55">{subline}</div>
        </div>
        {counting && (
          <span className="shrink-0 text-4xl font-light tabular-nums text-ink/70">
            {remaining}
          </span>
        )}
      </div>

      {/* Alarmo: which sensors are in the way, and the option to arm anyway. */}
      {blocked && (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-300/15 p-4">
          <div className="mb-2 text-[13px] font-medium text-ink/70">
            Open right now
          </div>
          <div className="space-y-1">
            {blockingSensors.map((id) => {
              const sensor = entities[id];
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 text-[14px]"
                >
                  <span className="min-w-0 truncate">
                    {sensor ? friendlyName(sensor) : id}
                  </span>
                  <span className="shrink-0 text-ink/55">
                    {sensor ? stateLabel(sensor) : (openSensors?.[id] ?? "open")}
                  </span>
                </div>
              );
            })}
          </div>
          {isAlarmo && sentAction && sentAction !== "disarm" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => request(sentAction, true)}
                className="pressable flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-ink-contrast"
              >
                Bypass and {ACTION_LABELS[sentAction].toLowerCase()}
              </button>
              <button
                onClick={() => setDismissedOpen(true)}
                className="glass-pill pressable flex h-12 items-center px-5 text-[14px] font-medium"
              >
                Close them first
              </button>
            </div>
          )}
        </div>
      )}

      {codeFor === null ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action}
              disabled={inFlight}
              onClick={() => request(action)}
              className={`pressable flex h-14 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:opacity-40 ${
                action === "disarm"
                  ? "col-span-full bg-ink text-ink-contrast"
                  : "glass-pill"
              }`}
            >
              {action === "night" && <Moon size={17} />}
              {action === "vacation" && <Palmtree size={17} />}
              {ACTION_LABELS[action]}
            </button>
          ))}
          {isAlarmo && arming && (
            <button
              onClick={() =>
                void callService("alarmo", "skip_delay", {
                  entity_id: entity.entity_id,
                })
              }
              className="glass-pill pressable col-span-full flex h-12 items-center justify-center gap-2 text-[14px] font-medium"
            >
              <Zap size={16} /> Arm now, skip the exit delay
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="text-sm text-ink/55">
              Enter code to {ACTION_LABELS[codeFor.action].toLowerCase()}
              {codeFor.force ? " with bypass" : ""}
            </span>
            <PinDots length={code.length} />
          </div>
          <Keypad value={code} onChange={setCode} onCancel={() => setCodeFor(null)} />
          <button
            disabled={code.length === 0}
            onClick={() => run(codeFor.action, code, codeFor.force)}
            className="pressable mx-auto mt-3 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-ink-contrast disabled:opacity-30"
          >
            {ACTION_LABELS[codeFor.action]}
          </button>
        </div>
      )}
    </div>
  );
}
