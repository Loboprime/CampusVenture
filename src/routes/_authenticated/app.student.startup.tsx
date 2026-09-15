import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDebouncedField } from "@/hooks/use-debounced-field";
import {
  CheckCircle2,
  FileUp,
  Github,
  Lightbulb,
  Loader2,
  Send,
  Star,
  Target,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchRepoMetadata } from "@/lib/github.functions";
import { parseVideoUrl } from "@/lib/video";
import { STATUS_LABEL, completeness, useVenture } from "@/lib/store";
import { startupService } from "@/services/startupService";

const TITLE = "My Startup — CampusVenture";
const DESCRIPTION =
  "Build your startup profile: problem statement, solution, video pitch, deck upload and GitHub project.";

export const Route = createFileRoute("/_authenticated/app/student/startup")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: MyStartup,
});

function MyStartup() {
  const { myStartup, updateStartup, submitForReview, refresh, loading } = useVenture();
  const startup = myStartup;
  const fileRef = useRef<HTMLInputElement>(null);
  const [github, setGithub] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [problem, setProblem] = useDebouncedField(startup?.problem ?? "", (v) => {
    if (startup) void updateStartup(startup.id, { problem: v });
  });
  const [solution, setSolution] = useDebouncedField(startup?.solution ?? "", (v) => {
    if (startup) void updateStartup(startup.id, { solution: v });
  });
  const [model, setModel] = useDebouncedField(startup?.businessModel ?? "", (v) => {
    if (startup) void updateStartup(startup.id, { businessModel: v });
  });
  const [traction, setTraction] = useDebouncedField(startup?.traction ?? "", (v) => {
    if (startup) void updateStartup(startup.id, { traction: v });
  });
  const [videoUrl, setVideoUrl] = useDebouncedField(startup?.videoUrl ?? "", (v) => {
    if (startup) void updateStartup(startup.id, { videoUrl: v });
  });
  const [name, setName] = useDebouncedField(startup?.name ?? "", (v) => {
    if (startup && v.trim()) void updateStartup(startup.id, { name: v.trim() });
  });

  useEffect(() => {
    setGithub(startup?.githubUrl ?? "");
  }, [startup?.githubUrl]);

  if (loading || !startup) {
    return (
      <AppShell role="student">
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      </AppShell>
    );
  }

  const pct = completeness(startup);
  const embed = parseVideoUrl(startup.videoUrl);

  async function handleFile(file: File | undefined) {
    if (!file || !startup) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Pitch decks must be under 20 MB.");
      return;
    }
    setUploading(true);
    try {
      await startupService.uploadDeck(startup.id, file);
      await refresh();
      toast.success(`${file.name} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function connectGithub() {
    if (!startup) return;
    setConnecting(true);
    try {
      const meta = await fetchRepoMetadata({ data: { url: github.trim() } });
      if (!meta.ok) {
        toast.error(meta.reason ?? "Could not verify that repository.");
        return;
      }
      await updateStartup(startup.id, {
        githubUrl: meta.htmlUrl ?? github.trim(),
        githubStars: meta.stars ?? 0,
        githubForks: meta.forks ?? 0,
        githubPushedAt: meta.pushedAt ?? null,
      });
      toast.success("GitHub project connected", {
        description: `${meta.fullName} · ${meta.stars} stars`,
      });
    } catch {
      toast.error("Could not reach GitHub.");
    } finally {
      setConnecting(false);
    }
  }

  async function submit() {
    if (!startup) return;
    if (pct < 60) {
      toast.error("Complete at least 60% of your profile before submitting.");
      return;
    }
    try {
      await submitForReview(startup.id);
      toast.success("Submitted to your university for verification");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit.");
    }
  }

  return (
    <AppShell role="student">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-64 flex-1">
            <Label htmlFor="startup-name" className="text-xs text-muted-foreground">
              Startup name
            </Label>
            <Input
              id="startup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 text-lg font-semibold"
            />
            <p className="mt-1 text-sm text-muted-foreground">
              {startup.sector} · {startup.stage} · {startup.university || "Add your university"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={startup.status === "approved" ? "default" : "secondary"}>
              {STATUS_LABEL[startup.status]}
            </Badge>
            <Button onClick={() => void submit()} disabled={startup.status === "pending"}>
              <Send className="size-4" aria-hidden="true" />
              {startup.status === "pending" ? "Awaiting review" : "Submit for review"}
            </Button>
          </div>
        </div>

        {startup.reviewNote && startup.status === "rejected" && (
          <Card className="border-destructive/40">
            <CardContent className="py-4 text-sm">
              <span className="font-medium">Reviewer note: </span>
              {startup.reviewNote}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-5">
            <div className="min-w-48 flex-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Profile completeness</span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <Progress value={pct} className="mt-2" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Chip done={Boolean(startup.problem)} label="Problem" />
              <Chip done={Boolean(startup.solution)} label="Solution" />
              <Chip done={Boolean(startup.videoUrl)} label="Video pitch" />
              <Chip done={Boolean(startup.deckPath)} label="Pitch deck" />
              <Chip done={Boolean(startup.githubUrl)} label="GitHub" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="problem">
          <TabsList className="flex-wrap">
            <TabsTrigger value="problem">Problem</TabsTrigger>
            <TabsTrigger value="solution">Solution</TabsTrigger>
            <TabsTrigger value="video">Video pitch</TabsTrigger>
            <TabsTrigger value="deck">Pitch deck</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
          </TabsList>

          <TabsContent value="problem">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4" aria-hidden="true" /> Problem statement
                </CardTitle>
                <CardDescription>
                  Who hurts, how often, and what it costs them today. Saved as you type.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="problem">Problem</Label>
                <Textarea
                  id="problem"
                  rows={7}
                  value={problem}
                  placeholder="Engineering students wait days for coursework feedback…"
                  onChange={(e) => setProblem(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {problem.trim().split(/\s+/).filter(Boolean).length} words · aim for 60–120
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="solution">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4" aria-hidden="true" /> Solution
                </CardTitle>
                <CardDescription>What you built, and why it wins against the status quo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="solution">Solution</Label>
                  <Textarea
                    id="solution"
                    rows={6}
                    value={solution}
                    placeholder="An adaptive AI tutor that grades in minutes…"
                    onChange={(e) => setSolution(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="model">Business model</Label>
                    <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="traction">Traction</Label>
                    <Input id="traction" value={traction} onChange={(e) => setTraction(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="funding">Funding required (USD)</Label>
                    <Input
                      id="funding"
                      type="number"
                      min={0}
                      defaultValue={startup.fundingRequired}
                      onBlur={(e) =>
                        void updateStartup(startup.id, { fundingRequired: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team">Team size</Label>
                    <Input
                      id="team"
                      type="number"
                      min={1}
                      defaultValue={startup.teamSize}
                      onBlur={(e) => void updateStartup(startup.id, { teamSize: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Input
                      id="sector"
                      defaultValue={startup.sector}
                      onBlur={(e) => void updateStartup(startup.id, { sector: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      defaultValue={startup.university}
                      onBlur={(e) => void updateStartup(startup.id, { university: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="size-4" aria-hidden="true" /> Video pitch
                </CardTitle>
                <CardDescription>Paste a YouTube or Vimeo link (2–3 minutes).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video">Video URL</Label>
                  <Input
                    id="video"
                    value={videoUrl}
                    placeholder="https://www.youtube.com/watch?v=…"
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
                {embed ? (
                  <div className="aspect-video overflow-hidden rounded-xl border">
                    <iframe
                      src={embed.embedUrl}
                      title="Pitch video"
                      className="size-full"
                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    Add a valid YouTube or Vimeo link to preview your pitch here.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deck">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileUp className="size-4" aria-hidden="true" /> Pitch deck
                </CardTitle>
                <CardDescription>
                  PDF or PPTX up to 20 MB. Stored privately and shared only with approved investors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="rounded-xl border border-dashed p-10 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleFile(e.dataTransfer.files[0]);
                  }}
                >
                  <p className="text-sm text-muted-foreground">Drag & drop your deck here</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? "Uploading…" : "Choose file"}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                </div>
                {startup.deckPath && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                      {startup.deckName}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const url = await startupService.deckUrl(startup.deckPath!);
                        window.open(url, "_blank", "noopener");
                      }}
                    >
                      Preview
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="github">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Github className="size-4" aria-hidden="true" /> GitHub project
                </CardTitle>
                <CardDescription>
                  Link a public repository — we read its real stars and last push from GitHub.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/team/project"
                    aria-label="GitHub repository URL"
                    className="min-w-56 flex-1"
                  />
                  <Button onClick={() => void connectGithub()} disabled={connecting}>
                    {connecting ? "Checking…" : "Connect"}
                  </Button>
                </div>
                {startup.githubUrl && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
                    <a
                      href={startup.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {startup.githubUrl.replace("https://github.com/", "")}
                    </a>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5" aria-hidden="true" />
                        {startup.githubStars ?? 0} stars
                      </span>
                      {startup.githubPushedAt && (
                        <span>last push {new Date(startup.githubPushedAt).toLocaleDateString()}</span>
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Chip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 ${done ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
    >
      {done ? "✓" : "•"} {label}
    </span>
  );
}
