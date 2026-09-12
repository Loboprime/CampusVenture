import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MeetingsView } from "@/components/meetings-view";

const TITLE = "Meetings — CampusVenture Investor";
const DESCRIPTION = "Book and manage calls with student founders in your pipeline.";

export const Route = createFileRoute("/_authenticated/app/investor/meetings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorMeetings,
});

function InvestorMeetings() {
  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-sm text-muted-foreground">Founder calls and pending requests.</p>
        </div>
        <MeetingsView as="investor" />
      </div>
    </AppShell>
  );
}
