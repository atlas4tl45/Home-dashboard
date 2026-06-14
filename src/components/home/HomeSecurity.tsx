import { useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import type { HassEntity } from "@/types";
import { callService } from "@/api/ha";
import { friendlyName, isUnavailable } from "@/lib/entities";

const STATE_LABELS: Record<string, string> = {
  disarmed: "Disarmed",
  armed_home: "Armed · Home",
  armed_away: "Armed · Away",
  armed_night: "Armed · Night",
  armed_vacation: "Armed · Vacation",
  arming: "Arming…",
  pending: "Pending…",
  triggered: "Triggered!",
};

/** Custom, frameless security panel; tints itself by alarm state. */
export function HomeSecurity({ alarms }: { alarms: HassEntity[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Security
      </h2>
      <div className="flex flex-col gap-4">
        {alarms.map((a) => (
          <AlarmPanel key={a.entity_id} entity={a} />
        ))}
      </div>
    </div>
  );
}

function AlarmPanel({ entity }: { entity: HassEntity }) {
  const unavailable = isUnavailable(entity);
  const state = entity.state;
  const attrs = entity.attributes ?? {};
  const needsCode = !!attrs.code_format;
  const armRequiresCode = attrs.code_arm_required !== false && needsCode;
  const [code, setCode] = useState("");

  const armed = state.startsWith("armed");
  const triggered = state === "triggered";

  const call = (service: string, requireCode: boolean) => {
    const data: Record<string, unknown> = {};
    if (requireCode && code) data.code = code;
    callService("alarm_control_panel", service, data, { entity_id: entity.entity_id });
    setCode("");
  };

  const tint = triggered
    ? "bg-red-500/15 text-red-500"
    : armed
      ? "bg-accent/15 text-accent"
      : "bg-surface-2 text-muted";
  const Icon = triggered ? ShieldAlert : armed ? ShieldCheck : ShieldOff;

  return (
    <div className="rounded-3xl p-5" style={{ background: "rgb(var(--surface))" }}>
      <div className="flex items-center gap-4">
        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tint}`}>
          <Icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm text-muted">{friendlyName(entity)}</div>
          <div className="text-lg font-semibold">
            {unavailable ? "Unavailable" : STATE_LABELS[state] ?? state}
          </div>
        </div>
      </div>

      {!unavailable && (
        <div className="mt-4 flex flex-col gap-2">
          {needsCode && (state === "disarmed" ? armRequiresCode : true) && (
            <input
              className="input"
              type="password"
              inputMode={attrs.code_format === "number" ? "numeric" : "text"}
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          {state === "disarmed" ? (
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-outline px-2 py-2.5 text-xs" onClick={() => call("alarm_arm_home", armRequiresCode)}>
                Home
              </button>
              <button className="btn-outline px-2 py-2.5 text-xs" onClick={() => call("alarm_arm_away", armRequiresCode)}>
                Away
              </button>
              <button className="btn-outline px-2 py-2.5 text-xs" onClick={() => call("alarm_arm_night", armRequiresCode)}>
                Night
              </button>
            </div>
          ) : (
            <button
              className="btn w-full bg-red-500 text-white hover:opacity-90"
              onClick={() => call("alarm_disarm", needsCode)}
            >
              Disarm
            </button>
          )}
        </div>
      )}
    </div>
  );
}
