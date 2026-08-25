// Alarm control: big state readout, arm/disarm actions, and a glass keypad
// when the panel requires a code.

import { useState } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  Delete,
  Loader2,
  Moon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TriangleAlert,
} from "lucide-react";
import { callService } from "@/lib/ha";
import { ALARM_LABELS, capitalize, isUnavailable } from "@/lib/entities";
import { usePendingAction } from "@/hooks/usePendingAction";

type AlarmAction = "alarm_disarm" | "alarm_arm_home" | "alarm_arm_away" | "alarm_arm_night";

const ACTION_LABELS: Record<AlarmAction, string> = {
  alarm_disarm: "Disarm",
  alarm_arm_home: "Arm Home",
  alarm_arm_away: "Arm Away",
  alarm_arm_night: "Arm Night",
};

const TARGET_STATE: Record<AlarmAction, string> = {
  alarm_disarm: "disarmed",
  alarm_arm_home: "armed_home",
  alarm_arm_away: "armed_away",
  alarm_arm_night: "armed_night",
};

export function AlarmPanel({ entity }: { entity: HassEntity }) {
  const [pending, setPending] = useState<AlarmAction | null>(null);
  const [code, setCode] = useState("");
  // Panels take several seconds to arm — and exit delays take longer — so
  // show progress from the moment the button is pressed.
  const {
    working,
    pending: inFlight,
    timedOut,
    begin,
    cancel,
  } = usePendingAction(entity, { timeoutMs: 120_000 });
  const [sentAction, setSentAction] = useState<AlarmAction | null>(null);

  const state = entity.state;
  const armed = state.startsWith("armed");
  const triggered = state === "triggered" || state === "pending";
  const codeFormat = entity.attributes.code_format as string | undefined;
  const codeArmRequired = (entity.attributes.code_arm_required as boolean) ?? true;

  const needsCode = (action: AlarmAction) =>
    codeFormat != null && (action === "alarm_disarm" || codeArmRequired);

  function run(action: AlarmAction, withCode?: string) {
    setSentAction(action);
    begin((e) => e.state === TARGET_STATE[action]);
    callService(
      "alarm_control_panel",
      action,
      withCode ? { code: withCode } : undefined,
      entity.entity_id,
    ).catch(cancel);
    setPending(null);
    setCode("");
  }

  function request(action: AlarmAction) {
    if (needsCode(action)) {
      setPending(action);
      setCode("");
    } else {
      run(action);
    }
  }

  // HA's own transitional states, plus our optimistic one.
  const transitioning = state === "arming" || state === "disarming";
  const busy = working || transitioning;

  const StateIcon = busy
    ? Loader2
    : timedOut
      ? TriangleAlert
      : triggered
        ? ShieldAlert
        : armed
          ? ShieldCheck
          : state === "arming"
            ? Shield
            : ShieldOff;

  const tone = busy
    ? "bg-ink/[0.06] text-ink/70"
    : timedOut
      ? "bg-red-500 text-white"
      : triggered
        ? "bg-red-500 text-white"
        : armed
          ? "bg-emerald-600 text-white"
          : "bg-ink/[0.06] text-ink/70";

  const headline = busy
    ? sentAction === "alarm_disarm"
      ? "Disarming…"
      : sentAction
        ? "Arming…"
        : (ALARM_LABELS[state] ?? capitalize(state))
    : timedOut
      ? "No response"
      : (ALARM_LABELS[state] ?? state.replace(/_/g, " "));

  // supported_features bits: 1 = arm home, 2 = arm away, 4 = arm night.
  const features = (entity.attributes.supported_features as number) ?? 3;
  const actions: AlarmAction[] = armed
    ? ["alarm_disarm"]
    : (
        [
          [1, "alarm_arm_home"],
          [2, "alarm_arm_away"],
          [4, "alarm_arm_night"],
        ] as const
      )
        .filter(([bit]) => (features & bit) !== 0)
        .map(([, action]) => action);

  return (
    <div
      className={`glass p-6 ${isUnavailable(entity) ? "opacity-40" : ""} ${
        triggered ? "border-red-500/30 bg-red-400/15" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full ${tone} ${
            triggered && !busy ? "animate-pulse-alert" : ""
          }`}
        >
          <StateIcon size={28} className={busy ? "animate-spin" : ""} />
        </span>
        <div>
          <div className="text-xl font-semibold">{headline}</div>
          <div className="text-sm text-ink/55">
            {busy ? "Waiting for the panel" : "Security system"}
          </div>
        </div>
      </div>

      {pending === null ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action}
              disabled={inFlight}
              onClick={() => request(action)}
              className={`pressable flex h-14 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:opacity-40 ${
                action === "alarm_disarm"
                  ? "col-span-full bg-ink text-ink-contrast"
                  : "glass-pill"
              }`}
            >
              {action === "alarm_arm_night" && <Moon size={17} />}
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="text-sm text-ink/55">
              Enter code to {ACTION_LABELS[pending].toLowerCase()}
            </span>
            <span className="flex gap-2">
              {code.split("").map((_, i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-full bg-ink/80" />
              ))}
              {code.length === 0 && (
                <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
              )}
            </span>
          </div>
          <div className="mx-auto grid max-w-xs grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <KeypadButton key={d} onClick={() => setCode((c) => c + d)}>
                {d}
              </KeypadButton>
            ))}
            <KeypadButton dim onClick={() => setPending(null)}>
              Cancel
            </KeypadButton>
            <KeypadButton onClick={() => setCode((c) => c + "0")}>0</KeypadButton>
            <KeypadButton dim onClick={() => setCode((c) => c.slice(0, -1))}>
              <Delete size={20} />
            </KeypadButton>
          </div>
          <button
            disabled={code.length === 0}
            onClick={() => run(pending, code)}
            className="pressable mx-auto mt-3 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-30"
          >
            {ACTION_LABELS[pending]}
          </button>
        </div>
      )}
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  dim,
}: {
  children: React.ReactNode;
  onClick: () => void;
  dim?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-pill pressable flex h-16 items-center justify-center text-xl font-medium ${
        dim ? "text-[13px] font-normal text-ink/55" : ""
      }`}
    >
      {children}
    </button>
  );
}
