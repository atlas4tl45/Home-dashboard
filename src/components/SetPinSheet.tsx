import { useState } from "react";
import { useStore } from "@/store/store";
import { Keypad, PinDots } from "@/components/Keypad";
import { Sheet } from "@/components/Sheet";

const MIN_LENGTH = 4;

export function SetPinSheet({ onClose }: { onClose: () => void }) {
  const setKiosk = useStore((s) => s.setKiosk);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);

  function next() {
    if (confirming === null) {
      setConfirming(code);
      setCode("");
      return;
    }
    if (code === confirming) {
      setKiosk({ pin: code });
      onClose();
      return;
    }
    // Typed something different the second time — start over.
    setMismatch(true);
    setConfirming(null);
    setCode("");
  }

  return (
    <Sheet title="Set a PIN" onClose={onClose}>
      <div className="mb-4 flex items-center justify-center gap-3">
        <span
          className={`text-sm ${mismatch ? "text-red-600 dark:text-red-400" : "text-ink/55"}`}
        >
          {mismatch
            ? "Those didn't match — start again"
            : confirming === null
              ? `Choose a PIN (at least ${MIN_LENGTH} digits)`
              : "Enter it again to confirm"}
        </span>
        <PinDots length={code.length} />
      </div>
      <Keypad
        value={code}
        onChange={(value) => {
          setMismatch(false);
          setCode(value);
        }}
        onCancel={onClose}
      />
      <button
        disabled={code.length < MIN_LENGTH}
        onClick={next}
        className="pressable mx-auto mt-3 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-ink-contrast disabled:opacity-30"
      >
        {confirming === null ? "Continue" : "Save PIN"}
      </button>
      <p className="mt-3 text-center text-[12px] leading-relaxed text-ink/45">
        Keeps guests out of Settings. It's stored with your dashboard setup,
        not encrypted — don't reuse a PIN that matters.
      </p>
    </Sheet>
  );
}
