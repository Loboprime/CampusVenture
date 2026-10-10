import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_INVESTORS, READINESS_WEIGHTS, formatMoney, matchScore } from "@/lib/demo-data";
import { STATUS_LABEL, completeness, useVenture, type StartupRecord } from "@/lib/store";

const TITLE = "Founder Dashboard — CampusVenture";
const DESCRIPTION =
  "Track investment readiness, profile completeness and investor interest for your student startup.";

export const Route = createFileRoute("/app/student/")({
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

/** Derive per-category scores from what the founder has actually filled in. */
function categoryScores(s: StartupRecord): Record<string, number> {
  const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  const clamp = (n: number) => Math.max(20, Math.min(98, Math.round(n)));
  return {
    "Problem clarity": clamp(30 + words(s.problem) * 2.2),
    "Solution strength": clamp(30 + words(s.solution) * 2.2),
    "Market opportunity": clamp(45 + s.monthlyUsers / 200),
    "Business model": clamp(35 + words(s.businessModel) * 9),
    "Product readiness": clamp((s.githubUrl ? 55 : 30) + (s.videoUrl ? 20 : 0) + s.githubStars / 30),
    Traction: clamp((s.revenue ? 55 : 35) + words(s.traction) * 3),
    "Competitive advantage": clamp(40 + words(s.solution)),
    "Team readiness": clamp(45 + s.teamSize * 8),
    "Funding clarity": clamp((s.fundingRequired > 0 ? 55 : 25) + (s.deckName ? 25 : 0)),
  };
}

function assessment(s: StartupRecord, scores: Record<string, number>) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const strengths = entries.slice(0, 3).map(([k, v]) => `${k} is solid (${v}/100)`);
  const weaknesses = entries
    .slice(-3)
    .reverse()
    .map(([k, v]) => `${k} needs work (${v}/100)`);
  const recs: string[] = [];
  if (!s.videoUrl) recs.push("Record a 2–3 minute video pitch");
  if (!s.deckName) recs.push("Upload your pitch deck to the data room");
  if (!s.githubUrl) recs.push("Connect your GitHub repository");
  if (s.problem.trim().split(/\s+/).filter(Boolean).length < 40)
    recs.push("Expand the problem statement with cost and frequency data");
  if (!s.revenue) recs.push("Show a path to first revenue with pricing");
  recs.push("Quantify the addressable market");
  return { strengths, weaknesses, recommendations: recs.slice(0, 4) };
}


function StudentDashboard() {
  const { startups, saved, requests, updateStartup, notify } = useVenture();
  const STARTUP = startups[0]!;
  const [analyzing, setAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(true);

  const scores = categoryScores(STARTUP);
  const weighted = Math.round(
    READINESS_WEIGHTS.reduce((sum, { key, weight }) => sum + (scores[key] ?? 0) * (weight / 100), 0),
  );
  const review = assessment(STARTUP, scores);
  const pct = completeness(STARTUP);

  const matches = DEMO_INVESTORS.map((investor) => ({
    investor,
    ...matchScore(investor, STARTUP),
  })).sort((a, b) => b.score - a.score);

  const todo = [
    !STARTUP.problem && "Write your problem statement",
    !STARTUP.solution && "Describe your solution",
    !STARTUP.videoUrl && "Upload a 2–3 minute pitch video",
    !STARTUP.deckName && "Upload your pitch deck",
    !STARTUP.githubUrl && "Connect your GitHub project",
  ].filter(Boolean) as string[];

  function runAnalysis() {
    setAnalyzing(true);
    setShowResult(false);
    window.setTimeout(() => {
      const previous = STARTUP.readiness;
      updateStartup(STARTUP.id, { readiness: weighted });
      setAnalyzing(false);
      setShowResult(true);
      const delta = weighted - previous;
      toast.success(`Readiness re-scored: ${weighted}/100`, {
        description:
          delta === 0
            ? "No change since your last assessment."
            : `${delta > 0 ? "+" : ""}${delta} points versus your previous score.`,
      });
      notify("student", "AI assessment updated", `${STARTUP.name} now scores ${weighted}/100.`);
    }, 900);
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, Aayush</h1>
            <p className="text-sm text-muted-foreground">
              {STARTUP.name} · {STARTUP.stage} · {STARTUP.university} ·{" "}
              {STATUS_LABEL[STARTUP.status]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/student/startup">Edit my startup</Link>
            </Button>
            <Button onClick={runAnalysis} disabled={analyzing}>
              <Sparkles className="size-4" aria-hidden="true" />
              {analyzing ? "Analyzing…" : "Analyze Startup with AI"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Investment readiness</CardTitle>
              <CardDescription>
                {STARTUP.readiness >= 75
                  ? "Strong potential"
                  : STARTUP.readiness >= 55
                    ? "Promising, needs polish"
                    : "Early — keep building"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {analyzing ? (
                <Skeleton className="size-[132px] rounded-full" />
              ) : (
                <ScoreRing value={STARTUP.readiness} />
              )}
              <p className="text-center text-xs text-muted-foreground">
                AI-generated readiness assessment, not investment advice.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Category breakdown</CardTitle>
              <CardDescription>Weighted scoring across nine dimensions</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {READINESS_WEIGHTS.map(({ key, weight }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>{key}</span>
                    <span className="text-muted-foreground">
                      {scores[key]} · {weight}%
                    </span>
                  </div>
                  <Progress value={scores[key]} />
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
                {todo.length === 0 ? (
                  <li>· Everything essential is filled in.</li>
                ) : (
                  todo.map((t) => <li key={t}>· {t}</li>)
                )}
              </ul>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/student/startup">Complete profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Stat label="Investor profile views" value={String(STARTUP.views)} />
              <Stat label="Saved by investors" value={String(saved.length)} />
              <Stat
                label="Connection requests"
                value={String(
                  requests.filter((r) => r.startupId === STARTUP.id && r.kind === "connection")
                    .length,
                )}
              />
              <Stat
                label="Data-room requests"
                value={String(
                  requests.filter((r) => r.startupId === STARTUP.id && r.kind === "dataroom").length,
                )}
              />

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
                <Button variant="link" size="sm" className="mt-1">
                  Propose a meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {showResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest AI assessment</CardTitle>
              <CardDescription>
                Live scoring from your current profile · weighted score {weighted}/100
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <Section title="Strengths" items={review.strengths} />
              <Section title="Weaknesses" items={review.weaknesses} />
              <Section title="Recommendations" items={review.recommendations} />
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
                  Ticket {formatMoney(investor.ticketMin)}–{formatMoney(investor.ticketMax)} ·{" "}
                  {investor.geography}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    notify(
                      "investor",
                      "New founder outreach",
                      `${STARTUP.name} requested a connection.`,
                    );
                    toast.success(`Connection request sent to ${investor.name}`);
                  }}
                >
                  Request connection
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          Demo build: data is seeded locally and authentication is intentionally disabled.
        </p>
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
        {items.map((i) => (
          <li key={i}>· {i}</li>
        ))}
      </ul>
    </div>
  );
}
