import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FolderLock,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessagesSquare,
  Rocket,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useVenture } from "@/lib/store";
import type { Role } from "@/services/types";

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

const HOME: Record<Role, string> = {
  student: "/app/student",
  investor: "/app/investor",
  university: "/app/university",
};

/**
 * Application frame. `role` is the area the page belongs to; anyone signed in
 * with a different role is sent to their own dashboard.
 */
export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const items = NAV[role];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { role: myRole, loading } = useVenture();

  useEffect(() => {
    if (!loading && myRole && myRole !== role) {
      navigate({ to: HOME[myRole], replace: true });
    }
  }, [loading, myRole, role, navigate]);

  const blocked = Boolean(myRole) && myRole !== role;

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
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-sm transition-colors duration-300 lg:px-8">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-brand text-xs font-bold text-primary-foreground">
              CV
            </span>
            <span className="text-sm font-semibold">CampusVenture</span>
          </Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <AccountMenu role={role} />
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">
          {loading || blocked ? (
            <div className="grid min-h-[50vh] place-items-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
            </div>
          ) : (
            children
          )}
        </main>

        <nav
          className="sticky bottom-0 z-20 flex items-center justify-around border-t bg-background/95 py-2 backdrop-blur-sm transition-colors duration-300 lg:hidden"
          aria-label="Sections"
        >
          {[...items.slice(0, 4), items[items.length - 1]!].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors duration-200 active:scale-95",
                pathname === item.to && "text-primary",
              )}
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

function AccountMenu({ role }: { role: Role }) {
  const { profile, user, signOut } = useVenture();
  const navigate = useNavigate();
  const name = profile?.fullName || user?.email || "Your account";
  const settings = `${HOME[role]}/settings`;
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CV";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account menu"
          className="transition-transform duration-200 active:scale-95"
        >
          <span className="grid size-7 place-items-center rounded-full bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="text-xs font-normal capitalize text-muted-foreground">
            {profile?.organization || role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={settings}>
            <User className="size-4" aria-hidden="true" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={settings}>
            <Settings className="size-4" aria-hidden="true" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={async () => {
            await signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
