import type { ReactNode } from "react";
import { useClock } from "@/hooks/useClock";
import { useSecretTaps } from "@/hooks/useSecretTaps";
import { useStore } from "@/store/store";

/** Scrollable page container that leaves room for the dock on either edge. */
export function ViewShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto no-scrollbar px-6 pb-32 pt-7 landscape:pb-10 landscape:pl-32 landscape:pr-10">
      <div className="animate-rise mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

/** Standard page header: large title on the left, quiet clock on the right. */
export function ViewHeader({
  title,
  leading,
}: {
  title: string;
  leading?: ReactNode;
}) {
  const now = useClock();
  const requestSettings = useStore((s) => s.requestSettings);
  const onClockTap = useSecretTaps(requestSettings);
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <h1 className="truncate text-3xl font-semibold tracking-tight">{title}</h1>
      </div>
      <span
        onClick={onClockTap}
        data-clock
        className="shrink-0 cursor-default text-xl font-light tabular-nums text-ink/45"
      >
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </span>
    </div>
  );
}
