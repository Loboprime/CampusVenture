import { supabase } from "@/integrations/supabase/client";
import type { Stage } from "@/lib/demo-data";
import { auditService, notificationService } from "./notificationService";
import type { ReviewStatus, StartupRecord } from "./types";

type Row = Record<string, unknown>;

export function mapStartup(r: Row): StartupRecord {
  return {
    id: r["id"] as string,
    ownerId: (r["owner_id"] as string) ?? null,
    name: (r["name"] as string) ?? "",
    tagline: (r["tagline"] as string) ?? "",
    sector: (r["sector"] as string) ?? "Other",
    stage: ((r["stage"] as string) ?? "Idea") as Stage,
    location: (r["location"] as string) ?? "",
    university: (r["university"] as string) ?? "",
    teamSize: (r["team_size"] as number) ?? 1,
    fundingRequired: Number(r["funding_required"] ?? 0),
    revenue: Boolean(r["revenue"]),
    monthlyUsers: (r["monthly_users"] as number) ?? 0,
    problem: (r["problem"] as string) ?? "",
    solution: (r["solution"] as string) ?? "",
    businessModel: (r["business_model"] as string) ?? "",
    traction: (r["traction"] as string) ?? "",
    videoUrl: (r["video_url"] as string) ?? "",
    deckPath: (r["deck_path"] as string) ?? null,
    deckName: (r["deck_name"] as string) ?? "",
    githubUrl: (r["github_url"] as string) ?? "",
    githubStars: (r["github_stars"] as number) ?? null,
    githubForks: (r["github_forks"] as number) ?? null,
    githubPushedAt: (r["github_pushed_at"] as string) ?? null,
    readiness: (r["readiness"] as number) ?? 0,
    status: ((r["status"] as string) ?? "draft") as ReviewStatus,
    reviewNote: (r["review_note"] as string) ?? "",
    verified: Boolean(r["verified"]),
    views: (r["views"] as number) ?? 0,
    isDemo: Boolean(r["is_demo"]),
    updatedAt: (r["updated_at"] as string) ?? new Date().toISOString(),
  };
}

const PATCH_KEYS: Record<string, string> = {
  name: "name",
  tagline: "tagline",
  sector: "sector",
  stage: "stage",
  location: "location",
  university: "university",
  teamSize: "team_size",
  fundingRequired: "funding_required",
  revenue: "revenue",
  monthlyUsers: "monthly_users",
  problem: "problem",
  solution: "solution",
  businessModel: "business_model",
  traction: "traction",
  videoUrl: "video_url",
  deckPath: "deck_path",
  deckName: "deck_name",
  githubUrl: "github_url",
  readiness: "readiness",
  status: "status",
};

export const startupService = {
  async list(): Promise<StartupRecord[]> {
    const { data, error } = await supabase
      .from("startups")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapStartup(r as Row));
  },

  async createForOwner(ownerId: string, name: string): Promise<string> {
    const { data, error } = await supabase
      .from("startups")
      .insert({ owner_id: ownerId, name, status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    await auditService.log("startup.created", "startup", data.id);
    return data.id;
  },

  async update(id: string, patch: Partial<StartupRecord>) {
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      const column = PATCH_KEYS[key];
      if (column) payload[column] = value;
    }
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from("startups").update(payload).eq("id", id);
    if (error) throw error;
  },

  async submitForReview(id: string, name: string) {
    const { error } = await supabase
      .from("startups")
      .update({ status: "pending", review_note: "" })
      .eq("id", id);
    if (error) throw error;
    await auditService.log("startup.submitted", "startup", id, { name });
  },

  /** University decision. Writes an immutable review record alongside the status. */
  async review(
    id: string,
    status: ReviewStatus,
    note: string,
    reviewer: { id: string; name: string },
    previous: ReviewStatus,
    ownerId: string | null,
  ) {
    const { error } = await supabase
      .from("startups")
      .update({ status, review_note: note, verified: status === "approved" })
      .eq("id", id);
    if (error) throw error;
    await supabase.from("startup_reviews").insert({
      startup_id: id,
      reviewer_id: reviewer.id,
      reviewer_name: reviewer.name,
      previous_status: previous,
      new_status: status,
      note,
    });
    await auditService.log("startup.reviewed", "startup", id, { status, note });
    await notificationService.send(
      ownerId,
      "review",
      status === "approved" ? "Your startup was approved" : "Changes requested",
      note || (status === "approved" ? "Your profile is now visible to investors." : ""),
      id,
    );
  },

  async registerView(id: string, currentViews: number) {
    await supabase.from("startups").update({ views: currentViews + 1 }).eq("id", id);
  },

  async uploadDeck(startupId: string, file: File) {
    const path = `${startupId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage.from("pitch-decks").upload(path, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });
    if (error) throw error;
    const { error: updateError } = await supabase
      .from("startups")
      .update({ deck_path: path, deck_name: file.name })
      .eq("id", startupId);
    if (updateError) throw updateError;
    await auditService.log("deck.uploaded", "startup", startupId, { name: file.name });
    return path;
  },

  async deckUrl(path: string) {
    const { data, error } = await supabase.storage.from("pitch-decks").createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  },
};
