import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { dataRoomService } from "@/services/dataRoomService";
import {
  meetingService,
  messagingService,
  requestService,
  savedService,
  type ConversationRow,
} from "@/services/engagementService";
import { investorService } from "@/services/investorService";
import { notificationService } from "@/services/notificationService";
import { authService, profileService } from "@/services/profileService";
import { startupService } from "@/services/startupService";
import { programService, universityService } from "@/services/universityService";
import type {
  ConnectionRequest,
  DataRoomAccess,
  DataRoomDoc,
  InvestorRecord,
  Meeting,
  Message,
  NotificationRecord,
  ProfileRecord,
  Program,
  ReviewStatus,
  Role,
  StartupRecord,
  StudentRecord,
} from "@/services/types";

export type {
  ConnectionRequest,
  DataRoomAccess,
  DataRoomDoc,
  InvestorRecord,
  Meeting,
  Message,
  NotificationRecord,
  ProfileRecord,
  Program,
  ReviewStatus,
  StartupRecord,
  StudentRecord,
};

interface Workspace {
  startups: StartupRecord[];
  investors: InvestorRecord[];
  students: StudentRecord[];
  programs: Program[];
  notifications: NotificationRecord[];
  saved: string[];
  requests: ConnectionRequest[];
  conversations: ConversationRow[];
  messages: Message[];
  meetings: Meeting[];
  docs: DataRoomDoc[];
  access: DataRoomAccess[];
}

const EMPTY: Workspace = {
  startups: [],
  investors: [],
  students: [],
  programs: [],
  notifications: [],
  saved: [],
  requests: [],
  conversations: [],
  messages: [],
  meetings: [],
  docs: [],
  access: [],
};

interface Identity {
  user: User | null;
  role: Role | null;
  profile: ProfileRecord | null;
  investorId: string | null;
  startupId: string | null;
  studentId: string | null;
}

async function loadIdentity(user: User): Promise<Identity> {
  const [profile, role] = await Promise.all([
    profileService.getProfile(user.id),
    profileService.getRole(user.id),
  ]);

  let investorId: string | null = null;
  let startupId: string | null = null;
  let studentId: string | null = null;

  if (role === "investor") {
    const { data } = await supabase
      .from("investor_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    investorId = data?.id ?? null;
  }
  if (role === "student") {
    const [{ data: startup }, { data: student }] = await Promise.all([
      supabase.from("startups").select("id").eq("owner_id", user.id).limit(1).maybeSingle(),
      supabase.from("students").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    studentId = student?.id ?? null;
    startupId =
      startup?.id ??
      (await startupService.createForOwner(user.id, profile?.fullName ? `${profile.fullName}'s startup` : "My startup"));
  }
  return { user, role, profile, investorId, startupId, studentId };
}

async function loadWorkspace(): Promise<Workspace> {
  const conversations = await messagingService.listConversations();
  const [startups, investors, programs, notifications, requests, messages, meetings, docs, access] =
    await Promise.all([
      startupService.list(),
      investorService.list(),
      programService.list(),
      notificationService.listMine(),
      requestService.list(),
      messagingService.listMessages(conversations),
      meetingService.list(),
      dataRoomService.listDocuments(),
      dataRoomService.listAccess(),
    ]);

  let students: StudentRecord[] = [];
  try {
    students = await universityService.listStudents();
  } catch {
    students = [];
  }

  const saved = await savedService.list().catch(() => [] as string[]);

  return {
    startups,
    investors,
    students: students.map((s) => ({
      ...s,
      startupId: startups.find((x) => x.ownerId && x.ownerId === s.userId)?.id ?? null,
    })),
    programs,
    notifications,
    saved,
    requests,
    conversations,
    messages,
    meetings,
    docs,
    access,
  };
}

interface Ctx extends Workspace, Identity {
  loading: boolean;
  error: Error | null;
  hydrated: boolean;
  session: Session | null;
  myStartup: StartupRecord | null;
  unreadCount: number;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  markAllRead: () => Promise<void>;
  updateStartup: (id: string, patch: Partial<StartupRecord>) => Promise<void>;
  submitForReview: (id: string) => Promise<void>;
  setReview: (id: string, status: ReviewStatus, note?: string) => Promise<void>;
  toggleSaved: (startupId: string) => Promise<boolean>;
  addRequest: (startupId: string, kind: ConnectionRequest["kind"]) => Promise<void>;
  setRequestStatus: (id: string, status: ConnectionRequest["status"]) => Promise<void>;
  sendMessage: (
    startupId: string,
    investorId: string,
    from: "student" | "investor",
    text: string,
  ) => Promise<void>;
  markThreadRead: (startupId: string, investorId: string, as: "student" | "investor") => Promise<void>;
  requestMeeting: (m: Omit<Meeting, "id" | "status">) => Promise<void>;
  setMeetingStatus: (id: string, status: Meeting["status"]) => Promise<void>;
  uploadDoc: (file: File, category: string, confidential: boolean) => Promise<void>;
  removeDoc: (doc: DataRoomDoc) => Promise<void>;
  downloadDoc: (doc: DataRoomDoc) => Promise<string>;
  requestAccess: (startupId: string) => Promise<void>;
  setAccessStatus: (id: string, status: DataRoomAccess["status"], investorId: string) => Promise<void>;
  signNda: (startupId: string, name: string) => Promise<void>;
  toggleEnrollment: (programId: string, startupId: string) => Promise<boolean>;
  setProgramStatus: (id: string, status: Program["status"]) => Promise<void>;
  addProgram: (p: Omit<Program, "id" | "enrolled">) => Promise<void>;
  setStudentVerified: (id: string, verified: boolean, userId: string | null) => Promise<void>;
}

const VentureContext = createContext<Ctx | null>(null);

export function VentureProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const identityQuery = useQuery({
    queryKey: ["identity", userId],
    enabled: Boolean(session?.user),
    queryFn: () => loadIdentity(session!.user),
    staleTime: 60_000,
  });

  const workspaceQuery = useQuery({
    queryKey: ["workspace", userId],
    enabled: Boolean(userId) && Boolean(identityQuery.data),
    queryFn: loadWorkspace,
    staleTime: 15_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["workspace", userId] });
  }, [queryClient, userId]);

  // Live inbox + notifications for the signed-in user.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`live-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void refresh();
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const identity: Identity = identityQuery.data ?? {
    user: session?.user ?? null,
    role: null,
    profile: null,
    investorId: null,
    startupId: null,
    studentId: null,
  };
  const data = workspaceQuery.data ?? EMPTY;

  const value = useMemo<Ctx>(() => {
    const conversationId = (startupId: string, investorId: string) =>
      data.conversations.find((c) => c.startupId === startupId && c.investorId === investorId)?.id ?? null;

    const investorName = () =>
      data.investors.find((i) => i.id === identity.investorId)?.name ??
      identity.profile?.fullName ??
      "An investor";

    return {
      ...data,
      ...identity,
      session,
      loading: !authReady || identityQuery.isLoading || workspaceQuery.isLoading,
      hydrated: authReady && !workspaceQuery.isLoading,
      error: (workspaceQuery.error as Error) ?? (identityQuery.error as Error) ?? null,
      myStartup: data.startups.find((s) => s.id === identity.startupId) ?? null,
      unreadCount: data.notifications.filter((n) => !n.read).length,
      refresh,

      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await authService.signOut();
      },

      markAllRead: async () => {
        await notificationService.markAllRead();
        await refresh();
      },

      updateStartup: async (id, patch) => {
        await startupService.update(id, patch);
        await refresh();
      },

      submitForReview: async (id) => {
        const startup = data.startups.find((s) => s.id === id);
        await startupService.submitForReview(id, startup?.name ?? "");
        await refresh();
      },

      setReview: async (id, status, note = "") => {
        const startup = data.startups.find((s) => s.id === id);
        if (!identity.user) throw new Error("Not signed in");
        await startupService.review(
          id,
          status,
          note,
          { id: identity.user.id, name: identity.profile?.fullName ?? "University" },
          startup?.status ?? "pending",
          startup?.ownerId ?? null,
        );
        await refresh();
      },

      toggleSaved: async (startupId) => {
        if (!identity.investorId) throw new Error("Only investor accounts can save startups.");
        const added = await savedService.toggle(
          identity.investorId,
          startupId,
          data.saved.includes(startupId),
        );
        await refresh();
        return added;
      },

      addRequest: async (startupId, kind) => {
        if (!identity.investorId) throw new Error("Only investor accounts can send requests.");
        await requestService.create(startupId, identity.investorId, kind, investorName());
        await refresh();
      },

      setRequestStatus: async (id, status) => {
        await requestService.setStatus(id, status);
        await refresh();
      },

      sendMessage: async (startupId, investorId, from, text) => {
        if (!identity.user) throw new Error("Not signed in");
        await messagingService.send(
          startupId,
          investorId,
          from,
          text,
          identity.user.id,
          identity.profile?.fullName ?? "Someone",
        );
        await refresh();
      },

      markThreadRead: async (startupId, investorId, as) => {
        const id = conversationId(startupId, investorId);
        if (!id) return;
        const hasUnread = data.messages.some(
          (m) =>
            m.conversationId === id && (as === "student" ? !m.readByStudent : !m.readByInvestor),
        );
        if (!hasUnread) return;
        await messagingService.markRead(id, as);
        await refresh();
      },

      requestMeeting: async (m) => {
        if (!identity.user) throw new Error("Not signed in");
        await meetingService.request(m, identity.user.id, identity.profile?.fullName ?? "Someone");
        await refresh();
      },

      setMeetingStatus: async (id, status) => {
        await meetingService.setStatus(id, status);
        await refresh();
      },

      uploadDoc: async (file, category, confidential) => {
        if (!identity.startupId) throw new Error("You need a startup profile first.");
        await dataRoomService.upload(identity.startupId, file, category, confidential);
        await refresh();
      },

      removeDoc: async (doc) => {
        await dataRoomService.remove(doc);
        await refresh();
      },

      downloadDoc: async (doc) => {
        const url = await dataRoomService.downloadUrl(doc);
        const record = data.access.find(
          (a) => a.startupId === doc.startupId && a.investorId === identity.investorId,
        );
        if (record) await dataRoomService.registerDownload(record.id, record.downloads);
        await refresh();
        return url;
      },

      requestAccess: async (startupId) => {
        if (!identity.investorId) throw new Error("Only investor accounts can request access.");
        await dataRoomService.requestAccess(startupId, identity.investorId, investorName());
        await refresh();
      },

      setAccessStatus: async (id, status, investorId) => {
        await dataRoomService.setAccessStatus(id, status, investorId);
        await refresh();
      },

      signNda: async (startupId, name) => {
        if (!identity.investorId || !identity.user) throw new Error("Not signed in as an investor.");
        await dataRoomService.acceptNda(startupId, identity.investorId, identity.user.id, name);
        await refresh();
      },

      toggleEnrollment: async (programId, startupId) => {
        const program = data.programs.find((p) => p.id === programId);
        const added = await programService.toggleEnrollment(
          programId,
          startupId,
          Boolean(program?.enrolled.includes(startupId)),
        );
        await refresh();
        return added;
      },

      setProgramStatus: async (id, status) => {
        await programService.setStatus(id, status);
        await refresh();
      },

      addProgram: async (p) => {
        if (!identity.user) throw new Error("Not signed in");
        await programService.create(p, identity.user.id);
        await refresh();
      },

      setStudentVerified: async (id, verified, targetUserId) => {
        if (!identity.user) throw new Error("Not signed in");
        await universityService.setStudentVerified(id, verified, identity.user.id, targetUserId);
        await refresh();
      },
    };
  }, [
    data,
    identity,
    session,
    authReady,
    identityQuery.isLoading,
    identityQuery.error,
    workspaceQuery.isLoading,
    workspaceQuery.error,
    refresh,
    queryClient,
  ]);

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

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    Boolean(s.deckPath),
    Boolean(s.githubUrl.trim()),
    Boolean(s.traction.trim()),
    Boolean(s.businessModel.trim()),
    s.fundingRequired > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
