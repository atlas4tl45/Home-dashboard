import type { HassEntity } from "@/types";

export interface CardProps {
  entity: HassEntity | undefined;
  /** Display name (room override or friendly name). */
  name: string;
  /** Whether the room is in edit mode (show remove control). */
  editing?: boolean;
  onRemove?: () => void;
}
