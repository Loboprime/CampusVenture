import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, matchScore } from "@/lib/demo-data";
import { STATUS_LABEL, completeness, formatWhen, useVenture } from "@/lib/store";
import { readinessService, scoreStartup } from "@/services/readinessService";

const TITLE = "Founder Dashboard — CampusVenture";
const DESCRIPTION =
  "Track investment readiness, profile completeness and investor interest for your student startup.";

export const Route = createFileRoute("/_authenticated/app/student/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { myStartup, investors, requests, meetings, profile, refresh } = useVenture();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const latest = useQuery({
    queryKey: ["readiness", myStartup?.id],
    enabled: Boolean(myStartup?.id),
    queryFn: () => readinessService.latest(myStartup!.id),
  });

  if (!myStartup) return <AppShell role="student">{null}</AppShell>;
  const startup = myStartup;

  const live = scoreStartup(startup);
  const result = latest.data;
  const breakdown = result?.breakdown ?? live.breakdown;
  const pct = completeness(startup);

  const matches = investors
    .map((investor) => ({ investor, ...matchScore(investor, startup) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const upcoming = meetings
    .filter((m) => m.startupId === startup.id && m.status !== "declined" && m.at > new Date().toISOString())
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 3);

  const todo = [
    !startup.problem && "Write your problem statement",
    !startup.solution && "Describe your solution",
    !startup.videoUrl && "Add a 2–3 minute pitch video",
    !startup.deckPath && "Upload your pitch deck",
    !startup.githubUrl && "Connect your GitHub project",
  ].filter(Boolean) as string[];

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const previous = startup.readiness;
      const r = await readinessService.analyse(startup);
      await queryClient.invalidateQueries({ queryKey: ["readiness", startup.id] });
      await refresh();
      const delta = r.score - previous;
      toast.success(`Readiness scored: ${r.score}/100`, {
        description:
          delta === 0 ? "No change since your last assessment." : `${delta > 0 ? "+" : ""}${delta} points.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assessment failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  const firstName = (profile?.fullName || "founder").split(" ")[0];

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
            <p className="text-sm text-muted-foreground">
              {startup.name} · {startup.stage} · {startup.university || "University not set"} ·{" "}
              {STATUS_LABEL[startup.status]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/student/startup">Edit my startup</Link>
            </Button>
            <Button onClick={() => void runAnalysis()} disabled={analyzing}>
              <Sparkles className="size-4" aria-hidden="true" />
              {analyzing ? "Analyzing…" : "Analyze Startup with AI"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investment readiness</CardTitle>
              <CardDescription>
                {result
                  ? `Last assessed ${formatWhen(result.generatedAt)}`
                  : "Not assessed yet — run your first analysis."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {analyzing || latest.isLoading ? (
                <Skeleton className="size-[132px] rounded-full" />
              ) : (
                <ScoreRing value={result?.score ?? startup.readiness} />
              )}
              <p className="text-center text-xs text-muted-foreground">
                Score from published rules; written feedback by AI. Not investment advice.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Category breakdown</CardTitle>
              <CardDescription>Nine categories, points out of each category's maximum</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {breakdown.map((c) => (
                <div key={c.label} className="space-y-1.5" title={c.hint}>
                  <div className="flex items-center justify-between text-xs">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <Progress value={(c.score / c.max) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile completeness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{pct}%</span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
              <Progress value={pct} />
              <ul className="space-y-1 text-sm text-muted-foreground">
                {todo.length === 0 ? <li>· Everything essential is filled in.</li> : todo.map((t) => <li key={t}>· {t}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Stat label="Investor profile views" value={String(startup.views)} />
              <Stat
                label="Connection requests"
                value={String(requests.filter((r) => r.startupId === startup.id && r.kind === "connection").length)}
              />
              <Stat
                label="Data-room requests"
                value={String(requests.filter((r) => r.startupId === startup.id && r.kind === "dataroom").length)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
                  <Button variant="link" size="sm" asChild>
                    <Link to="/app/student/meetings">Propose a meeting</Link>
                  </Button>
                </div>
              ) : (
                upcoming.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatWhen(m.at)} · {m.status}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest assessment</CardTitle>
              <CardDescription>{result.analysis}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <Section title="Strengths" items={result.strengths} />
              <Section title="Weaknesses" items={result.weaknesses} />
              <Section title="Recommendations" items={result.recommendations} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investor matches</CardTitle>
            <CardDescription>Transparent weighted matching against your startup profile</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {matches.map(({ investor, score, reasons }) => (
              <div key={investor.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{investor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {investor.organization} · {investor.type}
                    </p>
                  </div>
                  <Badge variant="secondary">{score}% match</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{investor.thesis}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Ticket {formatMoney(investor.ticketMin)}–{formatMoney(investor.ticketMax)} · {investor.geography}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Button variant="outline" asChild className="md:col-span-2">
              <Link to="/app/student/discover">See all investors</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.length === 0 ? <li>—</li> : items.map((i) => <li key={i}>· {i}</li>)}
      </ul>
    </div>
  );
}
