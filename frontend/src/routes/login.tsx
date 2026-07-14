import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Sprout } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Sign in · CareerOS" }],
  }),
});

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string;

function loginWithGithub() {
  const redirectUri = `${window.location.origin}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "read:user",
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
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
          <Button size="lg" className="w-full" onClick={loginWithGithub}>
            <Github className="h-4 w-4" />
            Login with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
