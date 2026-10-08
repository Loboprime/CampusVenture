import { supabase } from "@/integrations/supabase/client";
import { auditService, notificationService } from "./notificationService";
import type { ConnectionRequest, Meeting, Message } from "./types";

export interface ConversationRow {
  id: string;
  startupId: string;
  investorId: string;
}

async function ownerOfStartup(startupId: string) {
  const { data } = await supabase.from("startups").select("owner_id").eq("id", startupId).maybeSingle();
  return data?.owner_id ?? null;
}

async function userOfInvestor(investorId: string) {
  const { data } = await supabase
    .from("investor_profiles")
    .select("user_id")
    .eq("id", investorId)
    .maybeSingle();
  return data?.user_id ?? null;
}

export const savedService = {
  async list(): Promise<string[]> {
    const { data, error } = await supabase.from("saved_startups").select("startup_id");
    if (error) throw error;
    return (data ?? []).map((r) => r.startup_id);
  },
  async toggle(investorId: string, startupId: string, isSaved: boolean) {
    if (isSaved) {
      const { error } = await supabase
        .from("saved_startups")
        .delete()
        .eq("investor_id", investorId)
        .eq("startup_id", startupId);
      if (error) throw error;
      return false;
    }
    const { error } = await supabase
      .from("saved_startups")
      .insert({ investor_id: investorId, startup_id: startupId });
    if (error) throw error;
    return true;
  },
};

export const requestService = {
  async list(): Promise<ConnectionRequest[]> {
    const { data, error } = await supabase
      .from("connection_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      startupId: r.startup_id,
      investorId: r.investor_id,
      kind: r.kind,
      status: r.status,
      at: r.created_at,
    }));
  },

  async create(
    startupId: string,
    investorId: string,
    kind: ConnectionRequest["kind"],
    investorName: string,
  ) {
    const { error } = await supabase
      .from("connection_requests")
      .insert({ startup_id: startupId, investor_id: investorId, kind });
    if (error) {
      if (error.code === "23505") throw new Error("You already have a pending request with this startup.");
      throw error;
    }
    await notificationService.send(
      await ownerOfStartup(startupId),
      "connection",
      kind === "connection" ? "New connection request" : "Data-room access requested",
      `${investorName} would like to connect.`,
      startupId,
    );
    await auditService.log("connection.requested", "startup", startupId, { kind });
  },

  async setStatus(id: string, status: ConnectionRequest["status"]) {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", id);
    if (error) throw error;
    await auditService.log("connection.updated", "connection_request", id, { status });
  },
};

export const messagingService = {
  async listConversations(): Promise<ConversationRow[]> {
    const { data, error } = await supabase.from("conversations").select("id,startup_id,investor_id");
    if (error) throw error;
    return (data ?? []).map((c) => ({
      id: c.id,
      startupId: c.startup_id,
      investorId: c.investor_id,
    }));
  },

  async listMessages(conversations: ConversationRow[]): Promise<Message[]> {
    if (conversations.length === 0) return [];
    const byId = new Map(conversations.map((c) => [c.id, c]));
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in(
        "conversation_id",
        conversations.map((c) => c.id),
      )
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((m) => {
      const c = byId.get(m.conversation_id);
      return {
        id: m.id,
        conversationId: m.conversation_id,
        startupId: c?.startupId ?? "",
        investorId: c?.investorId ?? "",
        from: m.sender_role === "investor" ? "investor" : "student",
        text: m.body,
        at: m.created_at,
        readByStudent: m.read_by_student,
        readByInvestor: m.read_by_investor,
      } satisfies Message;
    });
  },

  async ensureConversation(startupId: string, investorId: string) {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("startup_id", startupId)
      .eq("investor_id", investorId)
      .maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ startup_id: startupId, investor_id: investorId })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  async send(
    startupId: string,
    investorId: string,
    from: "student" | "investor",
    text: string,
    senderId: string,
    senderName: string,
  ) {
    const conversationId = await this.ensureConversation(startupId, investorId);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_role: from,
      body: text,
      read_by_student: from === "student",
      read_by_investor: from === "investor",
    });
    if (error) throw error;
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
    const target =
      from === "student" ? await userOfInvestor(investorId) : await ownerOfStartup(startupId);
    await notificationService.send(
      target,
      "message",
      "New message",
      `${senderName}: ${text.slice(0, 80)}`,
      startupId,
    );
  },

  async markRead(conversationId: string, as: "student" | "investor") {
    const patch = as === "student" ? { read_by_student: true } : { read_by_investor: true };
    await supabase.from("messages").update(patch).eq("conversation_id", conversationId);
  },
};

export const meetingService = {
  async list(): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((m) => ({
      id: m.id,
      startupId: m.startup_id,
      investorId: m.investor_id,
      title: m.title,
      at: m.scheduled_at,
      minutes: m.minutes,
      status: m.status,
      requestedBy: m.requested_by === "investor" ? "investor" : "student",
    }));
  },

  async request(
    input: Omit<Meeting, "id" | "status">,
    createdBy: string,
    requesterName: string,
  ) {
    const { error } = await supabase.from("meetings").insert({
      startup_id: input.startupId,
      investor_id: input.investorId,
      title: input.title,
      scheduled_at: input.at,
      minutes: input.minutes,
      requested_by: input.requestedBy,
      created_by: createdBy,
    });
    if (error) throw error;
    const target =
      input.requestedBy === "student"
        ? await userOfInvestor(input.investorId)
        : await ownerOfStartup(input.startupId);
    await notificationService.send(
      target,
      "meeting",
      "Meeting request",
      `${requesterName}: ${input.title}`,
      input.startupId,
    );
  },

  async setStatus(id: string, status: Meeting["status"]) {
    const { error } = await supabase.from("meetings").update({ status }).eq("id", id);
    if (error) throw error;
    await auditService.log("meeting.updated", "meeting", id, { status });
  },
};

export const engagementHelpers = { ownerOfStartup, userOfInvestor };
