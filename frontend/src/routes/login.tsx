import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Sprout } from "lucide-react";
import type { OAuthProvider } from "@/lib/types";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in · CareerOS" }],
  }),
});

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

const PROVIDER_CONFIG: Record<OAuthProvider, { authorizeUrl: string; clientId: string; params: Record<string, string> }> = {
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    clientId: GITHUB_CLIENT_ID,
    params: { scope: "read:user" },
  },
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: GOOGLE_CLIENT_ID,
    params: { scope: "openid email profile", response_type: "code", access_type: "offline", prompt: "select_account" },
  },
};

function loginWithProvider(provider: OAuthProvider) {
  const { authorizeUrl, clientId, params: extraParams } = PROVIDER_CONFIG[provider];
  const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, ...extraParams });
  window.location.href = `${authorizeUrl}?${params.toString()}`;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-sm">
            <Sprout className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">CareerOS</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to access your personal job application copilot.</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button size="lg" className="w-full" onClick={() => loginWithProvider("github")}>
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => loginWithProvider("google")}>
              <GoogleIcon />
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
