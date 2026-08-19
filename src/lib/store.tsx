import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_STARTUPS, type Role, type Startup } from "@/lib/demo-data";

export type ReviewStatus = "draft" | "pending" | "approved" | "rejected";

export interface StartupRecord extends Startup {
  problem: string;
  solution: string;
  videoUrl: string;
  deckName: string;
  githubUrl: string;
  githubStars: number;
  status: ReviewStatus;
  reviewNote: string;
  views: number;
}

export interface Notification {
  id: string;
  role: Role;
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface ConnectionRequest {
  id: string;
  startupId: string;
  investorId: string;
  kind: "connection" | "dataroom";
  status: "pending" | "accepted" | "declined";
  at: string;
}

interface State {
  startups: StartupRecord[];
  notifications: Notification[];
  saved: string[];
  requests: ConnectionRequest[];
}

const STORAGE_KEY = "campusventure.state.v1";

const SEED_EXTRAS: Record<string, Partial<StartupRecord>> = {
  s1: {
    problem:
      "Engineering students get feedback on coursework days after submission, so misconceptions compound across an entire semester.",
    solution:
      "An adaptive AI tutor that grades submissions in minutes, explains every deduction and generates a personalised practice path.",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    deckName: "lumen-labs-seed-deck.pdf",
    githubUrl: "https://github.com/lumenlabs/adaptive-tutor",
    githubStars: 412,
    status: "approved",
    views: 126,
  },
  s2: { status: "pending", views: 54 },
  s3: { status: "draft", views: 18 },
  s4: { status: "approved", views: 233 },
  s5: { status: "pending", views: 61 },
  s6: { status: "approved", views: 147 },
};

function seed(): State {
  const startups = DEMO_STARTUPS.map<StartupRecord>((s) => ({
    ...s,
    problem: "",
    solution: "",
    videoUrl: "",
    deckName: "",
    githubUrl: "",
    githubStars: 0,
    status: "draft",
    reviewNote: "",
    views: 0,
    ...SEED_EXTRAS[s.id],
  }));

  const now = Date.now();
  const at = (min: number) => new Date(now - min * 60000).toISOString();

  return {
    startups,
    saved: [],
    requests: [],
    notifications: [
      {
        id: "n1",
        role: "student",
        title: "Northbridge Seed viewed your profile",
        body: "Anaya Krishnan opened Lumen Labs twice this week.",
        at: at(35),
        read: false,
      },
      {
        id: "n2",
        role: "student",
        title: "Your startup was approved",
        body: "COEP Innovation Cell verified Lumen Labs.",
        at: at(400),
        read: false,
      },
      {
        id: "n3",
        role: "investor",
        title: "3 new startups match your thesis",
        body: "EdTech and SaaS founders published updates today.",
        at: at(90),
        read: false,
      },
      {
        id: "n4",
        role: "investor",
        title: "Data-room access granted",
        body: "NeuroPulse approved your request.",
        at: at(600),
        read: true,
      },
      {
        id: "n5",
        role: "university",
        title: "2 startups awaiting review",
        body: "CropSense and GridShift submitted profiles for verification.",
        at: at(20),
        read: false,
      },
      {
        id: "n6",
        role: "university",
        title: "Investor interest is up 24%",
        body: "Weekly ecosystem digest is ready.",
        at: at(1500),
        read: true,
      },
    ],
  };
}

interface Ctx extends State {
  hydrated: boolean;
  unread: (role: Role) => number;
  notify: (role: Role, title: string, body: string) => void;
  markAllRead: (role: Role) => void;
  updateStartup: (id: string, patch: Partial<StartupRecord>) => void;
  setReview: (id: string, status: ReviewStatus, note?: string) => void;
  toggleSaved: (id: string) => boolean;
  addRequest: (startupId: string, investorId: string, kind: ConnectionRequest["kind"]) => void;
  resetDemo: () => void;
}

const VentureContext = createContext<Ctx | null>(null);

export function VentureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => seed());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...seed(), ...(JSON.parse(raw) as State) });
    } catch {
      /* corrupt storage: keep seed */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota: ignore */
    }
  }, [state, hydrated]);

  const notify = useCallback((role: Role, title: string, body: string) => {
    setState((prev) => ({
      ...prev,
      notifications: [
        {
          id: `n${Math.random().toString(36).slice(2, 9)}`,
          role,
          title,
          body,
          at: new Date().toISOString(),
          read: false,
        },
        ...prev.notifications,
      ],
    }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      hydrated,
      notify,
      unread: (role) => state.notifications.filter((n) => n.role === role && !n.read).length,
      markAllRead: (role) =>
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.role === role ? { ...n, read: true } : n,
          ),
        })),
      updateStartup: (id, patch) =>
        setState((prev) => ({
          ...prev,
          startups: prev.startups.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      setReview: (id, status, note = "") =>
        setState((prev) => ({
          ...prev,
          startups: prev.startups.map((s) =>
            s.id === id ? { ...s, status, reviewNote: note, verified: status === "approved" } : s,
          ),
        })),
      toggleSaved: (id) => {
        let added = false;
        setState((prev) => {
          added = !prev.saved.includes(id);
          return {
            ...prev,
            saved: added ? [...prev.saved, id] : prev.saved.filter((x) => x !== id),
          };
        });
        return added;
      },
      addRequest: (startupId, investorId, kind) =>
        setState((prev) => ({
          ...prev,
          requests: [
            {
              id: `r${Math.random().toString(36).slice(2, 9)}`,
              startupId,
              investorId,
              kind,
              status: "pending",
              at: new Date().toISOString(),
            },
            ...prev.requests,
          ],
        })),
      resetDemo: () => setState(seed()),
    }),
    [state, hydrated, notify],
  );

  return <VentureContext.Provider value={value}>{children}</VentureContext.Provider>;
}

export function useVenture() {
  const ctx = useContext(VentureContext);
  if (!ctx) throw new Error("useVenture must be used inside VentureProvider");
  return ctx;
}

export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Changes requested",
};

/** Profile completeness from the fields founders actually fill in. */
export function completeness(s: StartupRecord) {
  const checks = [
    Boolean(s.problem.trim()),
    Boolean(s.solution.trim()),
    Boolean(s.videoUrl.trim()),
    Boolean(s.deckName.trim()),
    Boolean(s.githubUrl.trim()),
    Boolean(s.traction.trim()),
    Boolean(s.businessModel.trim()),
    s.fundingRequired > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
