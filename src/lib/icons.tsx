import {
  Home,
  Sofa,
  BedDouble,
  CookingPot,
  Bath,
  Car,
  Trees,
  Briefcase,
  Tv,
  Lightbulb,
  ToggleRight,
  Thermometer,
  Lock,
  Camera,
  ShieldCheck,
  Blinds,
  Fan,
  Gauge,
  Activity,
  Sparkles,
  Music,
  DoorOpen,
  Utensils,
  Baby,
  Gamepad2,
  Dumbbell,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/** Icons selectable for rooms in the editor. */
export const ROOM_ICONS: Record<string, LucideIcon> = {
  home: Home,
  sofa: Sofa,
  bed: BedDouble,
  kitchen: CookingPot,
  bath: Bath,
  garage: Car,
  garden: Trees,
  office: Briefcase,
  tv: Tv,
  dining: Utensils,
  nursery: Baby,
  game: Gamepad2,
  gym: Dumbbell,
  utility: Warehouse,
  door: DoorOpen,
};

export const ROOM_ICON_NAMES = Object.keys(ROOM_ICONS);

export function RoomIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ROOM_ICONS[name] ?? Home;
  return <Icon className={className} />;
}

const DOMAIN_ICONS: Record<string, LucideIcon> = {
  light: Lightbulb,
  switch: ToggleRight,
  climate: Thermometer,
  lock: Lock,
  camera: Camera,
  alarm_control_panel: ShieldCheck,
  cover: Blinds,
  fan: Fan,
  scene: Sparkles,
  media_player: Music,
  sensor: Gauge,
  binary_sensor: Activity,
};

export function domainIcon(domain: string): LucideIcon {
  return DOMAIN_ICONS[domain] ?? Activity;
}
