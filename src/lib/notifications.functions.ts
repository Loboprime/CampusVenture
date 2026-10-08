import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  targetUserId: z.string().uuid(),
  type: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(160),
  body: z.string().max(1000).default(""),
  startupId: z.string().uuid().optional(),
});

export const createNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleRow, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (roleError) throw roleError;

    let authorized = false;
    if (roleRow?.role === "university") {
      const { data: student, error } = await context.supabase
        .from("students")
        .select("id")
        .eq("user_id", data.targetUserId)
        .maybeSingle();
      if (error) throw error;
      authorized = Boolean(student);
    } else if (data.startupId && (roleRow?.role === "student" || roleRow?.role === "investor")) {
      const [{ data: startup, error: startupError }, { data: investor, error: investorError }] =
        await Promise.all([
          context.supabase.from("startups").select("owner_id").eq("id", data.startupId).maybeSingle(),
          context.supabase
            .from("investor_profiles")
            .select("id")
            .eq("user_id", roleRow.role === "investor" ? context.userId : data.targetUserId)
            .maybeSingle(),
        ]);
      if (startupError) throw startupError;
      if (investorError) throw investorError;

      const isFounder = roleRow.role === "student" && startup?.owner_id === context.userId;
      const isInvestor = roleRow.role === "investor" && startup?.owner_id === data.targetUserId;
      if ((isFounder || isInvestor) && investor) {
        const [{ data: request }, { data: access }, { data: meeting }, { data: conversation }] =
          await Promise.all([
            context.supabase
              .from("connection_requests")
              .select("id")
              .eq("startup_id", data.startupId)
              .eq("investor_id", investor.id)
              .limit(1)
              .maybeSingle(),
            context.supabase
              .from("data_room_access")
              .select("id")
              .eq("startup_id", data.startupId)
              .eq("investor_id", investor.id)
              .limit(1)
              .maybeSingle(),
            context.supabase
              .from("meetings")
              .select("id")
              .eq("startup_id", data.startupId)
              .eq("investor_id", investor.id)
              .limit(1)
              .maybeSingle(),
            context.supabase
              .from("conversations")
              .select("id")
              .eq("startup_id", data.startupId)
              .eq("investor_id", investor.id)
              .limit(1)
              .maybeSingle(),
          ]);
        authorized = Boolean(request || access || meeting || conversation);
      }
    }

    if (!authorized) throw new Error("You cannot send a notification to this account.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: data.targetUserId,
      type: data.type,
      title: data.title,
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });