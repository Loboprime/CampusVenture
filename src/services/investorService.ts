import { supabase } from "@/integrations/supabase/client";
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
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload["name"] = patch.name;
    if (patch.organization !== undefined) payload["organization"] = patch.organization;
    if (patch.type !== undefined) payload["type"] = patch.type;
    if (patch.sectors !== undefined) payload["sectors"] = patch.sectors;
    if (patch.stages !== undefined) payload["stages"] = patch.stages;
    if (patch.ticketMin !== undefined) payload["ticket_min"] = patch.ticketMin;
    if (patch.ticketMax !== undefined) payload["ticket_max"] = patch.ticketMax;
    if (patch.geography !== undefined) payload["geography"] = patch.geography;
    if (patch.thesis !== undefined) payload["thesis"] = patch.thesis;
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from("investor_profiles").update(payload).eq("id", id);
    if (error) throw error;
  },
};
