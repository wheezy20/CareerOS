import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { OAuthProvider } from "@/lib/types";

export const Route = createFileRoute("/auth/callback/$provider")({
  component: AuthCallbackPage,
});

type Status = "loading" | "pending" | "error";

function AuthCallbackPage() {
  const { provider } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setStatus("error");
      setError(`No authorization code returned by ${provider}.`);
      return;
    }
    const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
    api.exchangeOAuthCode(provider as OAuthProvider, code, redirectUri)
      .then((result) => {
        if (result.status === "pending") {
          setStatus("pending");
          return;
        }
        setToken(result.token);
        navigate({ to: "/knowledge" });
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Sign in failed.");
      });
  }, [provider, navigate]);

  if (status === "pending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <h1 className="text-lg font-semibold">You're on the list</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account is pending approval for this instance. Check back once it's been approved.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/login" })}>Back to login</Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate({ to: "/login" })}>Back to login</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
