import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Centered glass sheet over a dimmed, blurred backdrop. Tap outside to close. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass animate-sheet-up w-full max-w-md rounded-4xl p-6 shadow-glass-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="glass-pill pressable flex h-10 w-10 items-center justify-center text-ink/70"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
