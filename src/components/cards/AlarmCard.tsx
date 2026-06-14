import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldOff, Shield } from "lucide-react";
import { CardShell } from "./CardShell";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";
import { isUnavailable } from "@/lib/entities";

const STATE_LABELS: Record<string, string> = {
  disarmed: "Disarmed",
  armed_home: "Armed — Home",
  armed_away: "Armed — Away",
  armed_night: "Armed — Night",
  armed_vacation: "Armed — Vacation",
  arming: "Arming…",
  pending: "Pending…",
  triggered: "Triggered!",
};

export function AlarmCard({ entity, name, editing, onRemove }: CardProps) {
  const unavailable = isUnavailable(entity);
  const state = entity?.state ?? "unknown";
  const attrs = entity?.attributes ?? {};
  // code_format "number"/"text" means HA expects a code for arm/disarm.
  const needsCode = !!attrs.code_format;
  const armRequiresCode = attrs.code_arm_required !== false && needsCode;
  const [code, setCode] = useState("");

  const triggered = state === "triggered";
  const armed = state.startsWith("armed");

  const call = (service: string, requireCode: boolean) => {
    const data: Record<string, unknown> = {};
    if (requireCode && code) data.code = code;
    callService("alarm_control_panel", service, data, {
      entity_id: entity!.entity_id,
    });
    setCode("");
  };

  const Icon = triggered
    ? ShieldAlert
    : armed
      ? ShieldCheck
      : ShieldOff;

  return (
    <CardShell
      icon={Icon}
      name={name}
      subtitle={unavailable ? "Unavailable" : STATE_LABELS[state] ?? state}
      active={armed || triggered}
      unavailable={unavailable}
      onRemove={editing ? onRemove : undefined}
    >
      {!unavailable && (
        <div className="flex flex-col gap-2">
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
            <div className="grid grid-cols-3 gap-1.5">
              <ArmButton label="Home" onClick={() => call("alarm_arm_home", armRequiresCode)} />
              <ArmButton label="Away" onClick={() => call("alarm_arm_away", armRequiresCode)} />
              <ArmButton label="Night" onClick={() => call("alarm_arm_night", armRequiresCode)} />
            </div>
          ) : (
            <button
              onClick={() => call("alarm_disarm", needsCode)}
              className="btn w-full bg-red-500 text-white hover:opacity-90"
            >
              <Shield className="h-4 w-4" />
              Disarm
            </button>
          )}
        </div>
      )}
    </CardShell>
  );
}

function ArmButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-outline px-2 py-2 text-xs">
      {label}
    </button>
  );
}
