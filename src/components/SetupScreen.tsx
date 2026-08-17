// First-run screen: connect the tablet to Home Assistant.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/store";

export function SetupScreen() {
  const connect = useStore((s) => s.connect);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const busy = status === "connecting";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !token || busy) return;
    try {
      await connect({ url, token });
    } catch {
      /* surfaced via store.error */
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="glass animate-rise w-full max-w-md rounded-4xl p-8 shadow-glass-lg"
      >
        <h1 className="text-2xl font-semibold">Welcome home</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-white/55">
          Connect this tablet to Home Assistant. Create a long-lived access
          token under <span className="text-white/80">Profile → Security</span>.
        </p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-[13px] font-medium text-white/60">
            Home Assistant address
          </span>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="http://homeassistant.local:8123"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-14 w-full select-text rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-[15px] placeholder:text-white/25 focus:border-white/30 focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-white/60">
            Access token
          </span>
          <textarea
            rows={3}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Paste your long-lived access token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full select-text resize-none rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-[13px] placeholder:text-white/25 focus:border-white/30 focus:outline-none"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-[13px] leading-relaxed text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!url || !token || busy}
          className="pressable mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white/90 text-[15px] font-semibold text-slate-900 disabled:opacity-30"
        >
          {busy && <Loader2 size={18} className="animate-spin" />}
          {busy ? "Connecting…" : "Connect"}
        </button>
      </form>
    </div>
  );
}
