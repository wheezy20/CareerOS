import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setError("No authorization code returned by GitHub.");
      return;
    }
    api.exchangeGithubCode(code)
      .then(({ token }) => {
        setToken(token);
        navigate({ to: "/knowledge" });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Sign in failed."));
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      {error ? (
        <>
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate({ to: "/login" })}>Back to login</Button>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completing sign in...</p>
        </>
      )}
    </div>
  );
}
