import { createFileRoute } from "@tanstack/react-router";
import { Building2, Eye, HandCoins } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_INVESTORS, formatMoney } from "@/lib/demo-data";
import { timeAgo, useVenture } from "@/lib/store";

const TITLE = "Investor Interest — CampusVenture University";
const DESCRIPTION =
  "See which investors are engaging with your campus startups: requests, data rooms and meetings.";

export const Route = createFileRoute("/app/university/investors")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: InvestorInterest,
});

function InvestorInterest() {
  const { requests, access, meetings, messages, startups } = useVenture();

  const stats = [
    { label: "Connection requests", value: requests.length, icon: HandCoins },
    { label: "Data-room grants", value: access.filter((a) => a.status === "granted").length, icon: Eye },
    { label: "Meetings booked", value: meetings.length, icon: Building2 },
  ];

  const rows = DEMO_INVESTORS.map((i) => ({
    investor: i,
    requests: requests.filter((r) => r.investorId === i.id).length,
    rooms: access.filter((a) => a.investorId === i.id).length,
    meetings: meetings.filter((m) => m.investorId === i.id).length,
    messages: messages.filter((m) => m.investorId === i.id).length,
  })).sort((a, b) => b.requests + b.rooms + b.meetings - (a.requests + a.rooms + a.meetings));

  const recent = [...requests]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  return (
    <AppShell role="university">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Investor interest</h1>
          <p className="text-sm text-muted-foreground">
            Live engagement across every startup in your ecosystem.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 pt-6">
                <s.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investors engaging with your campus</CardTitle>
            <CardDescription>Ranked by total activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Cheque</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Data rooms</TableHead>
                  <TableHead className="text-right">Meetings</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.investor.id}>
                    <TableCell>
                      <p className="font-medium">{r.investor.name}</p>
                      <p className="text-xs text-muted-foreground">{r.investor.organization}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatMoney(r.investor.ticketMin)}–{formatMoney(r.investor.ticketMax)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.requests}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.rooms}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.meetings}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.messages}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Latest investor requests across the ecosystem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.length === 0 && (
              <p className="text-muted-foreground">No investor requests yet.</p>
            )}
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">
                    {DEMO_INVESTORS.find((i) => i.id === r.investorId)?.name} →{" "}
                    {startups.find((s) => s.id === r.startupId)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.kind === "dataroom" ? "Data-room request" : "Connection request"} ·{" "}
                    {timeAgo(r.at)}
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
