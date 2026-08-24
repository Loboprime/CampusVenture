import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FolderLock,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/demo-data";

interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

const NAV: Record<Role, NavItem[]> = {
  student: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/app/student" },
    { label: "My Startup", icon: Rocket, to: "/app/student/startup" },
    { label: "Discover Investors", icon: Search, to: "/app/student/discover" },
    { label: "Data Room", icon: FolderLock, to: "/app/student/dataroom" },
    { label: "Messages", icon: MessagesSquare, to: "/app/student/messages" },
    { label: "Meetings", icon: CalendarClock, to: "/app/student/meetings" },
    { label: "Settings", icon: Settings, to: "/app/student/settings" },
  ],
  investor: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/app/investor" },
    { label: "Saved Startups", icon: Rocket, to: "/app/investor/saved" },
    { label: "Data Rooms", icon: FolderLock, to: "/app/investor/dataroom" },
    { label: "Messages", icon: MessagesSquare, to: "/app/investor/messages" },
    { label: "Meetings", icon: CalendarClock, to: "/app/investor/meetings" },
    { label: "Settings", icon: Settings, to: "/app/investor/settings" },
  ],
  university: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/app/university" },
    { label: "Review queue", icon: ClipboardCheck, to: "/app/university/review" },
    { label: "Students", icon: Users, to: "/app/university/students" },
    { label: "Startups", icon: Rocket, to: "/app/university/startups" },
    { label: "Programs", icon: GraduationCap, to: "/app/university/programs" },
    { label: "Investor Interest", icon: Building2, to: "/app/university/investors" },
    { label: "Settings", icon: Settings, to: "/app/university/settings" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  student: "Demo Student Founder",
  investor: "Demo Investor",
  university: "Demo University",
};


export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const items = NAV[role];
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <Link to="/" className="flex items-center gap-2 px-6 py-6">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-sm font-bold text-primary-foreground">
            CV
          </span>
          <span className="font-semibold">CampusVenture</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === item.to && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 text-xs text-muted-foreground">
          Auth is disabled in this build — role views are open for demo.
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="uppercase tracking-wide">
              Demo account
            </Badge>
            <span className="hidden text-sm text-muted-foreground sm:inline">{ROLE_LABEL[role]}</span>
          </div>
          <div className="flex items-center gap-1">
            <RoleSwitch current={role} />
            <NotificationBell role={role} />
            <ThemeToggle />
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        <nav
          className="sticky bottom-0 z-20 flex items-center justify-around border-t bg-background/95 py-2 backdrop-blur lg:hidden"
          aria-label="Sections"
        >
          {items.slice(0, 5).map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex flex-col items-center gap-1 px-2 text-[11px] text-muted-foreground"
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function RoleSwitch({ current }: { current: Role }) {
  const roles: Role[] = ["student", "investor", "university"];
  return (
    <div className="mr-1 hidden rounded-lg border p-0.5 sm:flex">
      {roles.map((r) => (
        <Link
          key={r}
          to={r === "student" ? "/app/student" : r === "investor" ? "/app/investor" : "/app/university"}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs capitalize transition-colors",
            r === current
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r}
        </Link>
      ))}
    </div>
  );
}
