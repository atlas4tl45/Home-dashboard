import type { RoomEntity } from "@/types";
import { useStore } from "@/store/useStore";
import { domainOf, friendlyName } from "@/lib/entities";
import { LightCard } from "./LightCard";
import { SwitchCard } from "./SwitchCard";
import { ClimateCard } from "./ClimateCard";
import { LockCard } from "./LockCard";
import { CameraCard } from "./CameraCard";
import { AlarmCard } from "./AlarmCard";
import { CoverCard } from "./CoverCard";
import { FanCard } from "./FanCard";
import { SensorCard } from "./SensorCard";

interface EntityCardProps {
  item: RoomEntity;
  editing?: boolean;
  onRemove?: () => void;
}

/** Routes an entity to its domain-specific card. */
export function EntityCard({ item, editing, onRemove }: EntityCardProps) {
  const entity = useStore((s) => s.entities[item.entity_id]);
  const name = item.name || friendlyName(entity, item.entity_id);
  const domain = domainOf(item.entity_id);
  const props = { entity, name, editing, onRemove };

  switch (domain) {
    case "light":
      return <LightCard {...props} />;
    case "switch":
      return <SwitchCard {...props} />;
    case "climate":
      return <ClimateCard {...props} />;
    case "lock":
      return <LockCard {...props} />;
    case "camera":
      return <CameraCard {...props} />;
    case "alarm_control_panel":
      return <AlarmCard {...props} />;
    case "cover":
      return <CoverCard {...props} />;
    case "fan":
      return <FanCard {...props} />;
    case "sensor":
    case "binary_sensor":
      return <SensorCard {...props} />;
    default:
      return <SwitchCard {...props} />;
  }
}
