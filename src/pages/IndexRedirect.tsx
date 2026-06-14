import { Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";

/** Land on the first room, or Settings if there are none yet. */
export function IndexRedirect() {
  const firstRoom = useStore((s) => s.config?.rooms[0]);
  return <Navigate to={firstRoom ? `/room/${firstRoom.id}` : "/settings"} replace />;
}
