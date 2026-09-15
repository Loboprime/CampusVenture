import { useEffect, useState } from "react";
import { LogOut, Save } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileService } from "@/services/profileService";
import { useVenture } from "@/lib/store";
import type { Role } from "@/services/types";

export function SettingsView({ role }: { role: Role }) {
  const { profile, user, refresh, signOut } = useVenture();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setOrganization(profile?.organization ?? "");
  }, [profile]);

  async function save() {
    if (!user) return;
    if (fullName.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setSaving(true);
    try {
      await profileService.updateProfile(user.id, {
        fullName: fullName.trim(),
        organization: organization.trim(),
      });
      await refresh();
      toast.success("Profile saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Shown to the people you work with on CampusVenture.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Name</Label>
            <Input id="st-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-email">Email</Label>
            <Input id="st-email" value={user?.email ?? ""} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-org">Organisation</Label>
            <Input
              id="st-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account type</Label>
            <Input value={role} readOnly disabled className="capitalize" />
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            <Save className="size-4" aria-hidden="true" /> Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Notifications appear in the bell in the header. Email delivery is not connected yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="size-4" aria-hidden="true" /> Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
