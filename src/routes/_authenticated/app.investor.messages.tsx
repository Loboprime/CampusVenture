import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MessagesView } from "@/components/messages-view";

const TITLE = "Messages — CampusVenture Investor";
const DESCRIPTION = "Message student founders directly about traction, metrics and next steps.";

export const Route = createFileRoute("/app/investor/messages")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorMessages,
});

function InvestorMessages() {
  return (
    <AppShell role="investor">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Conversations with student founders.</p>
        </div>
        <MessagesView as="investor" />
      </div>
    </AppShell>
  );
}
