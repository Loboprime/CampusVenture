import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVenture, type Program } from "@/lib/store";

const TITLE = "Programs — CampusVenture University";
const DESCRIPTION = "Run accelerator cohorts: manage seats, mentors, enrolment and programme status.";

export const Route = createFileRoute("/_authenticated/app/university/programs")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ProgramsPage,
});

const STATUSES: Program["status"][] = ["open", "running", "closed"];

function ProgramsPage() {
  const { programs, startups, toggleEnrollment, setProgramStatus, addProgram, notify } = useVenture();
  const [name, setName] = useState("");
  const [cohort, setCohort] = useState("Spring 2027");
  const [mentor, setMentor] = useState("");
  const [seats, setSeats] = useState("10");
  const [startsOn, setStartsOn] = useState("");

  function create() {
    if (!name.trim() || !mentor.trim() || !startsOn) {
      toast.error("Name, mentor and start date are required.");
      return;
    }
    addProgram({
      name: name.trim(),
      cohort,
      mentor: mentor.trim(),
      seats: Number(seats),
      status: "open",
      startsOn,
    });
    notify("student", "New programme open", `${name.trim()} (${cohort}) is accepting applications.`);
    toast.success("Programme created");
    setName("");
    setMentor("");
    setStartsOn("");
  }

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Programs</h1>
          <p className="text-sm text-muted-foreground">
            {programs.length} programmes ·{" "}
            {programs.reduce((n, p) => n + p.enrolled.length, 0)} enrolled startups
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a programme</CardTitle>
            <CardDescription>Cohorts appear instantly on the ecosystem dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cohort">Cohort</Label>
              <Input id="p-cohort" value={cohort} onChange={(e) => setCohort(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-mentor">Mentor</Label>
              <Input id="p-mentor" value={mentor} onChange={(e) => setMentor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-seats">Seats</Label>
              <Input
                id="p-seats"
                type="number"
                min={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="p-start">Starts on</Label>
              <Input
                id="p-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-3">
              <Button onClick={create}>
                <Plus className="size-4" aria-hidden="true" /> Create programme
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {programs.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <GraduationCap className="size-4" aria-hidden="true" /> {p.name}
                    </CardTitle>
                    <CardDescription>
                      {p.cohort} · mentor {p.mentor} · starts {p.startsOn}
                    </CardDescription>
                  </div>
                  <Select
                    value={p.status}
                    onValueChange={(v) => {
                      setProgramStatus(p.id, v as Program["status"]);
                      toast.success(`${p.name} marked ${v}`);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {p.enrolled.length} of {p.seats} seats filled
                    </span>
                    <span>{Math.round((p.enrolled.length / p.seats) * 100)}%</span>
                  </div>
                  <Progress value={Math.min(100, (p.enrolled.length / p.seats) * 100)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {startups.map((s) => {
                    const inCohort = p.enrolled.includes(s.id);
                    return (
                      <Button
                        key={s.id}
                        size="sm"
                        variant={inCohort ? "default" : "outline"}
                        onClick={() => {
                          const added = toggleEnrollment(p.id, s.id);
                          toast.success(
                            added ? `${s.name} enrolled in ${p.name}` : `${s.name} removed from ${p.name}`,
                          );
                          if (added) notify("student", "Programme enrolment", `${s.name} joined ${p.name}.`);
                        }}
                      >
                        {s.name}
                      </Button>
                    );
                  })}
                </div>
                {p.enrolled.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.enrolled.map((id) => (
                      <Badge key={id} variant="secondary">
                        {startups.find((s) => s.id === id)?.name ?? id}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
