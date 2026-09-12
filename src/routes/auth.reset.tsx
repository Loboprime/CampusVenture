import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/profileService";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({
    meta: [
      { title: "Choose a new password · CampusVenture" },
      { name: "description", content: "Set a new password for your CampusVenture account." },
      { property: "og:title", content: "Choose a new password · CampusVenture" },
      { property: "og:description", content: "Set a new password for your CampusVenture account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Open this page from the link in your reset email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const password = String(new FormData(e.currentTarget).get("password") ?? "");
              if (password.length < 8) {
                toast.error("Use at least 8 characters.");
                return;
              }
              setBusy(true);
              try {
                await authService.updatePassword(password);
                toast.success("Password updated.");
                navigate({ to: "/auth", replace: true });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not update the password.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
