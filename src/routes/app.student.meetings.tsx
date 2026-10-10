import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MeetingsView } from "@/components/meetings-view";

const TITLE = "Meetings — CampusVenture Founder";
const DESCRIPTION = "Schedule, confirm and track investor calls for your student startup.";

export const Route = createFileRoute("/app/student/meetings")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentMeetings,
});

function StudentMeetings() {
  return (
    <AppShell role="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-sm text-muted-foreground">Investor calls and pending slot requests.</p>
        </div>
        <MeetingsView as="student" />
      </div>
    </AppShell>
  );
}
