import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { authService } from "@/services/profileService";
import type { Role } from "@/services/types";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · CampusVenture" },
      {
        name: "description",
        content:
          "Sign in or create a CampusVenture account as a student founder, investor or university partner.",
      },
      { property: "og:title", content: "Sign in · CampusVenture" },
      {
        property: "og:description",
        content: "Access your CampusVenture dashboard for founders, investors and universities.",
      },
    ],
  }),
  component: AuthPage,
});

const HOME: Record<Role, string> = {
  student: "/app/student",
  investor: "/app/investor",
  university: "/app/university",
};

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  organization: z.string().trim().max(120),
  password: z.string().min(8, "Use at least 8 characters."),
  role: z.enum(["student", "investor", "university"]),
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const go = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      const role = (data?.role ?? "student") as Role;
      if (active) navigate({ to: HOME[role], replace: true });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void go(data.session.user.id);
      else if (active) setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void go(session.user.id);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const onSignIn = async (form: FormData) => {
    setBusy(true);
    try {
      await authService.signIn(
        String(form.get("email") ?? "").trim(),
        String(form.get("password") ?? ""),
      );
      toast.success("Welcome back");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = async (form: FormData) => {
    const parsed = signUpSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      organization: form.get("organization") ?? "",
      password: form.get("password"),
      role: form.get("role"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setBusy(true);
    try {
      await authService.signUp(parsed.data);
      toast.success("Account created — check your inbox to confirm your email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Google sign-in is unavailable right now.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
  };

  const onReset = async () => {
    const email = window.prompt("Which email address should we send the reset link to?");
    if (!email) return;
    try {
      await authService.requestPasswordReset(email.trim());
      toast.success("Reset link sent if that address has an account.");
    } catch {
      toast.error("Could not send the reset link.");
    }
  };

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-brand text-sm font-bold text-primary-foreground">
            CV
          </span>
          <span className="text-lg font-semibold">CampusVenture</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in, or create an account as a founder, investor or university.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSignIn(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => void onReset()}
                    className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSignUp(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input id="signup-name" name="fullName" required autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-org">University or organisation</Label>
                    <Input id="signup-org" name="organization" autoComplete="organization" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-role">I am a</Label>
                    <select
                      id="signup-role"
                      name="role"
                      defaultValue="student"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="student">Student founder</option>
                      <option value="investor">Investor</option>
                      <option value="university">University / incubator</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => void onGoogle()} disabled={busy}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
