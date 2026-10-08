import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import type { Stage } from "@/lib/demo-data";
import type { InvestorRecord } from "./types";

export const investorService = {
  async list(): Promise<InvestorRecord[]> {
    const { data, error } = await supabase.from("investor_profiles").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      organization: r.organization,
      type: r.type,
      sectors: r.sectors ?? [],
      stages: (r.stages ?? []) as Stage[],
      ticketMin: Number(r.ticket_min ?? 0),
      ticketMax: Number(r.ticket_max ?? 0),
      geography: r.geography,
      thesis: r.thesis,
      verified: r.verified,
    }));
  },

  async update(id: string, patch: Partial<InvestorRecord>) {
    const payload: TablesUpdate<"investor_profiles"> = {};
    Object.assign(payload, {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.organization !== undefined && { organization: patch.organization }),
      ...(patch.type !== undefined && { type: patch.type }),
      ...(patch.sectors !== undefined && { sectors: patch.sectors }),
      ...(patch.stages !== undefined && { stages: patch.stages }),
      ...(patch.ticketMin !== undefined && { ticket_min: patch.ticketMin }),
      ...(patch.ticketMax !== undefined && { ticket_max: patch.ticketMax }),
      ...(patch.geography !== undefined && { geography: patch.geography }),
      ...(patch.thesis !== undefined && { thesis: patch.thesis }),
    });
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from("investor_profiles").update(payload).eq("id", id);
    if (error) throw error;
  },
};
