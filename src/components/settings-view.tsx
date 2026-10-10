import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useVenture } from "@/lib/store";
import type { Role } from "@/lib/demo-data";

const DEFAULTS: Record<Role, { name: string; email: string; org: string; bio: string }> = {
  student: {
    name: "Aayush Patil",
    email: "aayush@coep.ac.in",
    org: "COEP Technological University",
    bio: "Final-year computer engineering student building Lumen Labs.",
  },
  investor: {
    name: "Anaya Krishnan",
    email: "anaya@northbridge.vc",
    org: "Northbridge Seed",
    bio: "Backing technical student founders building software for education and work.",
  },
  university: {
    name: "COEP Innovation Cell",
    email: "innovation@coep.ac.in",
    org: "COEP Technological University",
    bio: "Verifying student startups and running readiness programmes.",
  },
};

const KEY = (role: Role) => `campusventure.profile.${role}`;

export function SettingsView({ role }: { role: Role }) {
  const { resetDemo } = useVenture();
  const [profile, setProfile] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(KEY(role));
        if (raw) return { ...DEFAULTS[role], ...JSON.parse(raw) };
      } catch {
        /* ignore */
      }
    }
    return DEFAULTS[role];
  });
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(role === "university");

  function save() {
    try {
      window.localStorage.setItem(KEY(role), JSON.stringify(profile));
    } catch {
      /* ignore */
    }
    toast.success("Profile saved");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Shown on your public CampusVenture profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Name</Label>
            <Input
              id="st-name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-email">Email</Label>
            <Input
              id="st-email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-org">Organisation</Label>
            <Input
              id="st-org"
              value={profile.org}
              onChange={(e) => setProfile({ ...profile, org: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-bio">Bio</Label>
            <Textarea
              id="st-bio"
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>
          <Button onClick={save}>
            <Save className="size-4" aria-hidden="true" /> Save changes
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Control what reaches your inbox.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="st-alerts" className="font-normal">
                Email alerts for new activity
              </Label>
              <Switch id="st-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="st-digest" className="font-normal">
                Weekly ecosystem digest
              </Label>
              <Switch id="st-digest" checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace data</CardTitle>
            <CardDescription>
              Reset every startup, message, meeting and data-room record back to the seeded set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                resetDemo();
                toast.success("Workspace reset");
              }}
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Reset workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
