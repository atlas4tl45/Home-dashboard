import type { ForecastDay } from "@/hooks/useForecast";
import { weatherDisplay } from "@/lib/weather";

/** Frameless multi-day forecast strip. */
export function WeatherForecast({ days, unit }: { days: ForecastDay[]; unit: string }) {
  return (
    <div className="flex gap-7 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map((d, i) => {
        const { Icon } = weatherDisplay(d.condition);
        const date = new Date(d.datetime);
        return (
          <div key={d.datetime ?? i} className="flex min-w-[52px] flex-col items-center gap-2">
            <span className="text-xs font-medium text-muted">
              {i === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" })}
            </span>
            <Icon className="h-7 w-7 text-accent" />
            <div className="flex items-baseline gap-1.5">
              {d.temperature != null && (
                <span className="text-sm font-semibold tabular-nums">
                  {Math.round(d.temperature)}
                  {unit}
                </span>
              )}
              {d.templow != null && (
                <span className="text-xs text-muted tabular-nums">
                  {Math.round(d.templow)}
                  {unit}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
