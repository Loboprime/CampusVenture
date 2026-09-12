import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";

const TITLE = "Settings — CampusVenture Founder";
const DESCRIPTION = "Update your founder profile, notification preferences and workspace data.";

export const Route = createFileRoute("/app/student/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentSettings,
});

function StudentSettings() {
  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <SettingsView role="student" />
      </div>
    </AppShell>
  );
}
