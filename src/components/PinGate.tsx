// PIN prompt guarding Settings on a wall tablet.

import { useState } from "react";
import { useStore } from "@/store/store";
import { Keypad, PinDots } from "@/components/Keypad";
import { Sheet } from "@/components/Sheet";

export function PinGate() {
  const submitPin = useStore((s) => s.submitPin);
  const cancelPin = useStore((s) => s.cancelPin);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);

  function change(next: string) {
    setWrong(false);
    setCode(next);
  }

  function submit() {
    if (submitPin(code)) return; // the store navigates on success
    setWrong(true);
    setCode("");
  }

  return (
    <Sheet title="Settings" onClose={cancelPin}>
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className={`text-sm ${wrong ? "text-red-600 dark:text-red-400" : "text-ink/55"}`}>
          {wrong ? "Wrong PIN — try again" : "Enter your PIN"}
        </span>
        <PinDots length={code.length} />
      </div>
      <Keypad value={code} onChange={change} onCancel={cancelPin} />
      <button
        disabled={code.length < 4}
        onClick={submit}
        className="pressable mx-auto mt-3 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-ink-contrast disabled:opacity-30"
      >
        Unlock
      </button>
    </Sheet>
  );
}
