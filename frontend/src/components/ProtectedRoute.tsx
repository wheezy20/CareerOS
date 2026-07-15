import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { clearToken, getToken, isExpired } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  // Starts false on both server and the client's first paint (server never
  // knows about localStorage) — only flips true inside an effect, after the
  // client has actually checked. Reading the token synchronously during
  // render would make the client's first paint diverge from the server's,
  // triggering a React hydration-mismatch warning.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPublic) { setReady(true); return; }
    if (!getToken()) {
      navigate({ to: "/login" });
      return;
    }
    if (isExpired()) {
      clearToken();
      navigate({ to: "/login" });
      return;
    }
    setReady(true);
  }, [pathname, isPublic, navigate]);

  if (isPublic) return <>{children}</>;
  if (!ready) return null;
  return <>{children}</>;
}
