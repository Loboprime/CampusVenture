import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { SettingsView } from "@/components/settings-view";

const TITLE = "Settings — CampusVenture Investor";
const DESCRIPTION = "Update your fund profile, deal alerts and workspace preferences.";

export const Route = createFileRoute("/app/investor/settings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorSettings,
});

function InvestorSettings() {
  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <SettingsView role="investor" />
      </div>
    </AppShell>
  );
}
