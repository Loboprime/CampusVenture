import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";

const TITLE = "Settings — CampusVenture University";
const DESCRIPTION = "Manage your innovation-cell profile, digests and workspace data.";

export const Route = createFileRoute("/_authenticated/app/university/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: UniversitySettings,
});

function UniversitySettings() {
  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <SettingsView role="university" />
      </div>
    </AppShell>
  );
}
