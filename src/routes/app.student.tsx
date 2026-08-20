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

export const Route = createFileRoute("/app/student")({
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
  const [analyzing, setAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(true);

  const matches = DEMO_INVESTORS.map((investor) => ({
    investor,
    ...matchScore(investor, STARTUP),
  })).sort((a, b) => b.score - a.score);

  function runAnalysis() {
    setAnalyzing(true);
    setShowResult(false);
    toast.info("AI analysis is not connected yet in this build.", {
      description: "Showing the last saved assessment for this startup instead.",
    });
    window.setTimeout(() => {
      setAnalyzing(false);
      setShowResult(true);
    }, 900);
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, Aayush</h1>
            <p className="text-sm text-muted-foreground">
              {STARTUP.name} · {STARTUP.stage} · {STARTUP.university}
            </p>
          </div>
          <Button onClick={runAnalysis} disabled={analyzing}>
            <Sparkles className="size-4" aria-hidden="true" />
            {analyzing ? "Analyzing…" : "Analyze Startup with AI"}
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Investment readiness</CardTitle>
              <CardDescription>Strong potential</CardDescription>
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
                      {CATEGORY_SCORES[key]} · {weight}%
                    </span>
                  </div>
                  <Progress value={CATEGORY_SCORES[key]} />
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
                <span className="text-3xl font-semibold">78%</span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
              <Progress value={78} />
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>· Add GitHub link</li>
                <li>· Upload a 2–3 minute pitch video</li>
                <li>· Add achievements</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Stat label="Investor profile views" value="126" />
              <Stat label="Saved by investors" value="9" />
              <Stat label="Connection requests" value="3" />
              <Stat label="Data-room requests" value="1" />
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
              <CardDescription>Saved 12 Aug 2026 · Previous score 71 (+7)</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <Section title="Strengths" items={[
                "Clear, specific problem definition",
                "Working MVP with campus pilots",
                "Well-defined target users",
              ]} />
              <Section title="Weaknesses" items={[
                "Limited third-party traction evidence",
                "Business model needs pricing clarity",
                "Thin competitive analysis",
              ]} />
              <Section title="Recommendations" items={[
                "Add measurable retention metrics",
                "Document customer acquisition strategy",
                "Quantify the addressable market",
              ]} />
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
                  onClick={() => toast.success(`Connection request drafted for ${investor.name}`)}
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
