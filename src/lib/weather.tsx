import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  Cloudy,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Wind,
  type LucideIcon,
} from "lucide-react";

/** Map a Home Assistant weather `state` (condition) to an icon + label. */
const CONDITIONS: Record<string, { icon: LucideIcon; label: string }> = {
  "clear-night": { icon: Moon, label: "Clear" },
  sunny: { icon: Sun, label: "Sunny" },
  partlycloudy: { icon: CloudSun, label: "Partly cloudy" },
  cloudy: { icon: Cloudy, label: "Cloudy" },
  overcast: { icon: Cloud, label: "Overcast" },
  fog: { icon: CloudFog, label: "Fog" },
  hail: { icon: CloudSnow, label: "Hail" },
  lightning: { icon: CloudLightning, label: "Lightning" },
  "lightning-rainy": { icon: CloudLightning, label: "Thunderstorms" },
  pouring: { icon: CloudRain, label: "Pouring" },
  rainy: { icon: CloudRain, label: "Rain" },
  snowy: { icon: CloudSnow, label: "Snow" },
  "snowy-rainy": { icon: CloudSnow, label: "Sleet" },
  windy: { icon: Wind, label: "Windy" },
  "windy-variant": { icon: Wind, label: "Windy" },
  exceptional: { icon: Cloud, label: "Exceptional" },
};

export function weatherDisplay(condition: string | undefined): {
  Icon: LucideIcon;
  label: string;
} {
  const found = condition ? CONDITIONS[condition] : undefined;
  if (found) return { Icon: found.icon, label: found.label };
  return { Icon: CloudMoon, label: condition ? condition.replace(/_/g, " ") : "—" };
}
