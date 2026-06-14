import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { ConnectionSetup } from "@/components/ConnectionSetup";
import { AppShell } from "@/components/layout/AppShell";
import { RoomView } from "@/pages/RoomView";
import { Settings } from "@/pages/Settings";
import { IndexRedirect } from "@/pages/IndexRedirect";

export default function App() {
  const bootstrap = useStore((s) => s.bootstrap);
  const creds = useStore((s) => s.creds);
  const configLoading = useStore((s) => s.configLoading);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (configLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!creds) {
    return <ConnectionSetup />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<IndexRedirect />} />
          <Route path="room/:roomId" element={<RoomView />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
