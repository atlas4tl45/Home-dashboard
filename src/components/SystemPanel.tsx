import { useNavigate } from "react-router-dom";
import { RefreshCw, RotateCw, Settings as SettingsIcon, Wifi } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useStore } from "@/store/useStore";
import { normalizeUrl } from "@/api/ha";

const STATUS = {
  connected: { dot: "bg-emerald-500", label: "Connected" },
  connecting: { dot: "bg-amber-500 animate-pulse", label: "Connecting…" },
  disconnected: { dot: "bg-amber-500", label: "Disconnected" },
  error: { dot: "bg-red-500", label: "Connection error" },
  idle: { dot: "bg-muted", label: "Not connected" },
} as const;

/**
 * Hidden "maintenance" panel, revealed by triple-tapping the clock. Surfaces
 * connectivity and the few escape hatches (reload, reconnect, settings) without
 * exposing them to accidental taps during normal use.
 */
export function SystemPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const status = useStore((s) => s.status);
  const creds = useStore((s) => s.creds);
  const connect = useStore((s) => s.connect);
  const entityCount = useStore((s) => Object.keys(s.entities).length);

  const s = STATUS[status] ?? STATUS.idle;

  const reconnect = () => {
    if (creds) void connect(creds).catch(() => {});
  };

  return (
    <Modal open={open} onClose={onClose} title="System" size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
          <Wifi className="h-5 w-5 text-muted" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              {s.label}
            </div>
            <div className="truncate text-xs text-muted">
              {creds ? normalizeUrl(creds.url) : "No Home Assistant configured"}
              {status === "connected" && ` · ${entityCount} entities`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
          <button className="btn-outline" onClick={reconnect} disabled={!creds}>
            <RotateCw className="h-4 w-4" /> Reconnect
          </button>
        </div>

        <button
          className="btn-primary w-full"
          onClick={() => {
            onClose();
            navigate("/settings");
          }}
        >
          <SettingsIcon className="h-4 w-4" /> Open Settings
        </button>
      </div>
    </Modal>
  );
}
