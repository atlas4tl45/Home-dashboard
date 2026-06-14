import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CardShell } from "./CardShell";
import type { CardProps } from "./types";
import { callService } from "@/api/ha";

export function SceneCard({ entity, name, editing, onRemove }: CardProps) {
  const [activated, setActivated] = useState(false);

  const activate = () => {
    if (!entity) return;
    callService("scene", "turn_on", undefined, { entity_id: entity.entity_id });
    setActivated(true);
    setTimeout(() => setActivated(false), 1500);
  };

  return (
    <CardShell
      icon={Sparkles}
      name={name}
      subtitle={activated ? "Activated" : "Tap to run"}
      active={activated}
      onIconClick={activate}
      onRemove={editing ? onRemove : undefined}
    />
  );
}
