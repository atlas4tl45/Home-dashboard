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
  triggered: "Triggered",
};

/** Frameless security hero: large status with inline arm/disarm controls. */
export function HomeSecurity({ alarms }: { alarms: HassEntity[] }) {
  return (
    <div className="flex flex-col gap-6">
      {alarms.map((a) => (
        <AlarmRow key={a.entity_id} entity={a} multiple={alarms.length > 1} />
      ))}
    </div>
  );
}

function AlarmRow({ entity, multiple }: { entity: HassEntity; multiple: boolean }) {
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
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-surface-2 text-muted";
  const Icon = triggered ? ShieldAlert : armed ? ShieldCheck : ShieldOff;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
        <Icon className="h-8 w-8" />
      </span>
      <div className="min-w-0 flex-1">
        {multiple && (
          <div className="truncate text-xs uppercase tracking-wide text-muted">
            {friendlyName(entity)}
          </div>
        )}
        <div className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {unavailable ? "Unavailable" : STATE_LABELS[state] ?? state}
        </div>
      </div>

      {!unavailable && (
        <div className="flex flex-wrap items-center gap-2">
          {needsCode && (state === "disarmed" ? armRequiresCode : true) && (
            <input
              className="input w-28"
              type="password"
              inputMode={attrs.code_format === "number" ? "numeric" : "text"}
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          {state === "disarmed" ? (
            <>
              <button className="btn-outline" onClick={() => call("alarm_arm_home", armRequiresCode)}>
                Home
              </button>
              <button className="btn-outline" onClick={() => call("alarm_arm_away", armRequiresCode)}>
                Away
              </button>
              <button className="btn-outline" onClick={() => call("alarm_arm_night", armRequiresCode)}>
                Night
              </button>
            </>
          ) : (
            <button
              className="btn bg-red-500 px-5 text-white hover:opacity-90"
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
