import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MessagesView } from "@/components/messages-view";

const TITLE = "Messages — CampusVenture Founder";
const DESCRIPTION = "Talk directly with investors who reached out about your student startup.";

export const Route = createFileRoute("/_authenticated/app/student/messages")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentMessages,
});

function StudentMessages() {
  return (
    <AppShell role="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Conversations with interested investors.</p>
        </div>
        <MessagesView as="student" />
      </div>
    </AppShell>
  );
}
