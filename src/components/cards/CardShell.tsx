import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Active-state glow color, HaCasa-style "entity colored" tiles. */
type Tone = "accent" | "warm";

const TONE_ACTIVE: Record<Tone, string> = {
  accent: "bg-accent text-accent-fg shadow-[0_8px_20px_-8px_rgb(13_148_136_/_0.7)]",
  warm: "bg-amber-400 text-amber-950 shadow-[0_8px_22px_-8px_rgb(251_191_36_/_0.75)]",
};

interface CardShellProps {
  icon: LucideIcon;
  name: string;
  subtitle?: string;
  active?: boolean;
  unavailable?: boolean;
  tone?: Tone;
  /** Click handler for the icon button (e.g. quick toggle). */
  onIconClick?: () => void;
  /** Shown in edit mode to remove the entity from the room. */
  onRemove?: () => void;
  children?: ReactNode;
}

export function CardShell({
  icon: Icon,
  name,
  subtitle,
  active,
  unavailable,
  tone = "accent",
  onIconClick,
  onRemove,
  children,
}: CardShellProps) {
  return (
    <div
      className={`card relative flex flex-col gap-3 p-4 transition-opacity ${
        unavailable ? "opacity-60" : ""
      }`}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -right-2 -top-2 z-10 rounded-full border border-border bg-surface p-1 text-muted shadow-card hover:text-red-500"
          aria-label={`Remove ${name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onIconClick}
          disabled={!onIconClick || unavailable}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
            active ? TONE_ACTIVE[tone] : "bg-surface-2 text-muted"
          } ${onIconClick && !unavailable ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
        >
          <Icon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium leading-tight">{name}</div>
          {subtitle && (
            <div className="truncate text-sm text-muted">{subtitle}</div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
