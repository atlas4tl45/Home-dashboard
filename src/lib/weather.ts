import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";

/** Home Assistant weather conditions to an icon. */
export const WEATHER_ICONS: Record<string, LucideIcon> = {
  "clear-night": Moon,
  cloudy: Cloud,
  exceptional: CloudLightning,
  fog: CloudFog,
  hail: CloudSnow,
  lightning: CloudLightning,
  "lightning-rainy": CloudLightning,
  partlycloudy: CloudSun,
  pouring: CloudRain,
  rainy: CloudRain,
  snowy: CloudSnow,
  "snowy-rainy": CloudSnow,
  sunny: Sun,
  windy: Wind,
  "windy-variant": Wind,
};

export const weatherIcon = (condition: string | undefined): LucideIcon =>
  WEATHER_ICONS[condition ?? ""] ?? Cloud;
