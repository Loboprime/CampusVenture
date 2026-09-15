import { useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatWhen, useVenture } from "@/lib/store";

export function MeetingsView({ as }: { as: "student" | "investor" }) {
  const {
    meetings,
    startups,
    investors,
    requestMeeting,
    setMeetingStatus,
    startupId: myStartupId,
    investorId: myInvestorId,
  } = useVenture();

  const mine = meetings.filter((m) =>
    as === "student" ? m.startupId === myStartupId : m.investorId === myInvestorId,
  );
  const options =
    as === "student"
      ? investors.map((i) => ({ id: i.id, label: `${i.name} — ${i.organization}` }))
      : startups.filter((s) => s.status === "approved").map((s) => ({ id: s.id, label: s.name }));

  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("Intro call");
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [busy, setBusy] = useState(false);

  async function schedule() {
    const other = target || options[0]?.id;
    if (!other) {
      toast.error("Nobody to schedule with yet.");
      return;
    }
    if (!when) {
      toast.error("Pick a date and time.");
      return;
    }
    const startupId = as === "student" ? myStartupId : other;
    const investorId = as === "student" ? other : myInvestorId;
    if (!startupId || !investorId) {
      toast.error("Your account is missing a profile for this action.");
      return;
    }
    setBusy(true);
    try {
      await requestMeeting({
        startupId,
        investorId,
        title: title.trim() || "Meeting",
        at: new Date(when).toISOString(),
        minutes: Number(minutes),
        requestedBy: as,
      });
      toast.success("Meeting request sent");
      setWhen("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  }

  const label = (sId: string, iId: string) =>
    as === "student"
      ? (investors.find((i) => i.id === iId)?.name ?? "Investor")
      : (startups.find((s) => s.id === sId)?.name ?? "Startup");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your meetings</CardTitle>
          <CardDescription>Confirm, decline or track upcoming calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mine.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No meetings yet.
            </p>
          )}
          {mine
            .slice()
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {m.title} · {label(m.startupId, m.investorId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(m.at)} · {m.minutes} min · requested by {m.requestedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === "confirmed" ? "default" : "secondary"}>
                    {m.status}
                  </Badge>
                  {m.status === "requested" && m.requestedBy !== as && (
                    <>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await setMeetingStatus(m.id, "confirmed");
                          toast.success("Meeting confirmed");
                        }}
                      >
                        <Check className="size-4" aria-hidden="true" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await setMeetingStatus(m.id, "declined");
                          toast("Meeting declined");
                        }}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule a meeting</CardTitle>
          <CardDescription>Send a slot request to the other side.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{as === "student" ? "Investor" : "Startup"}</Label>
            <Select value={target || options[0]?.id || ""} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-title">Title</Label>
            <Input id="mt-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-when">Date & time</Label>
            <Input
              id="mt-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-min">Duration (minutes)</Label>
            <Input
              id="mt-min"
              type="number"
              min={15}
              step={15}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={() => void schedule()} disabled={busy}>
            <CalendarClock className="size-4" aria-hidden="true" /> Send request
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
