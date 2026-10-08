import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications.functions";
import type { NotificationRecord } from "./types";

/**
 * In-app notifications. Email delivery is intentionally not implemented — no
 * email provider is connected, so nothing here pretends to send mail.
 */
export const notificationService = {
  async listMine(): Promise<NotificationRecord[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,read,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      at: n.created_at,
      read: n.read,
    }));
  },

  /** Create a notification for a specific user. Silently skips a missing target. */
  async send(
    userId: string | null | undefined,
    type: string,
    title: string,
    body = "",
    startupId?: string,
  ) {
    if (!userId) return;
    await createNotification({ data: { targetUserId: userId, type, title, body, startupId } });
  },

  async markAllRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    if (error) throw error;
  },
};

export const auditService = {
  async log(action: string, entity: string, entityId?: string, metadata: Record<string, unknown> = {}) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({
      actor_id: data.user.id,
      action,
      entity,
      entity_id: entityId ?? null,
      metadata: metadata as never,
    });
  },
};
