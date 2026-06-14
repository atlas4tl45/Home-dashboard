import { useState } from "react";
import { Home, KeyRound, Loader2, ExternalLink } from "lucide-react";
import { useStore } from "@/store/useStore";

/** Full-screen onboarding shown until we have a working HA connection. */
export function ConnectionSetup() {
  const connect = useStore((s) => s.connect);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.connectionError);

  const [url, setUrl] = useState("http://homeassistant.local:8123");
  const [token, setToken] = useState("");
  const connecting = status === "connecting";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) return;
    try {
      await connect({ url, token });
    } catch {
      /* error surfaced via store */
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="card w-full max-w-md p-7 animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-fg">
            <Home className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">Connect Home Assistant</h1>
          <p className="mt-1 text-sm text-muted">
            Your token is stored only in this browser and used to talk to Home
            Assistant directly.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Home Assistant URL</span>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="h-4 w-4" /> Long-Lived Access Token
            </span>
            <textarea
              className="input min-h-[88px] resize-y font-mono text-xs"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJ0eXAiOiJKV1QiLCJhbGc…"
              spellCheck={false}
            />
            <a
              href={`${url.replace(/\/+$/, "")}/profile/security`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 text-xs text-accent hover:underline"
            >
              Create a token in your HA profile
              <ExternalLink className="h-3 w-3" />
            </a>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary mt-1 w-full"
            disabled={connecting || !url || !token}
          >
            {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
            {connecting ? "Connecting…" : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
