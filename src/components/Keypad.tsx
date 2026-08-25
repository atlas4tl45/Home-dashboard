// Glass number pad, shared by the alarm panel and the settings PIN prompt.

import { Delete } from "lucide-react";

export function Keypad({
  value,
  onChange,
  onCancel,
  cancelLabel = "Cancel",
}: {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  return (
    <div className="mx-auto grid max-w-xs grid-cols-3 gap-2.5">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <KeypadButton key={digit} onClick={() => onChange(value + digit)}>
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton dim onClick={onCancel}>
        {cancelLabel}
      </KeypadButton>
      <KeypadButton onClick={() => onChange(value + "0")}>0</KeypadButton>
      <KeypadButton dim onClick={() => onChange(value.slice(0, -1))}>
        <Delete size={20} />
      </KeypadButton>
    </div>
  );
}

/** Filled dot per entered digit, so the length is visible but not the code. */
export function PinDots({ length }: { length: number }) {
  return (
    <span className="flex gap-2">
      {Array.from({ length }, (_, i) => (
        <span key={i} className="h-2.5 w-2.5 rounded-full bg-ink/80" />
      ))}
      {length === 0 && <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />}
    </span>
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
