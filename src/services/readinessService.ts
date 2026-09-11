import { supabase } from "@/integrations/supabase/client";
import { explainReadiness, type ReadinessNarrative } from "@/lib/readiness.functions";
import type { StartupRecord } from "./types";

export const READINESS_VERSION = "rules-v1";

export interface ScoreCategory {
  label: string;
  score: number;
  max: number;
  hint: string;
}

export interface ReadinessResult {
  id?: string;
  score: number;
  breakdown: ScoreCategory[];
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  provider: string;
  version: string;
  generatedAt: string;
}

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

/** Transparent, rule-based scoring. Every point is explained by these rules. */
export function scoreStartup(s: StartupRecord): { score: number; breakdown: ScoreCategory[] } {
  const cat = (label: string, score: number, max: number, hint: string): ScoreCategory => ({
    label,
    score: Math.max(0, Math.min(max, Math.round(score))),
    max,
    hint,
  });

  const breakdown: ScoreCategory[] = [
    cat("Problem clarity", Math.min(12, words(s.problem) / 4), 12, "40+ words describing who suffers and how often."),
    cat("Solution strength", Math.min(12, words(s.solution) / 4), 12, "Explain the approach and why it works."),
    cat(
      "Market opportunity",
      (s.sector && s.sector !== "Other" ? 6 : 2) + (s.location ? 4 : 0),
      12,
      "Pick a specific sector and market.",
    ),
    cat("Business model", Math.min(12, words(s.businessModel) * 1.5), 12, "State how money is made."),
    cat(
      "Product readiness",
      { Idea: 2, Prototype: 5, MVP: 8, "Early Traction": 10, Revenue: 11, Growth: 12 }[s.stage] ?? 2,
      12,
      "Move from idea to a working product.",
    ),
    cat(
      "Traction",
      Math.min(12, words(s.traction) + (s.monthlyUsers > 0 ? 4 : 0) + (s.revenue ? 4 : 0)),
      12,
      "Add users, revenue or pilots.",
    ),
    cat(
      "Competitive advantage",
      (s.githubUrl ? 5 : 0) + (s.githubStars && s.githubStars > 0 ? 3 : 0) + (words(s.tagline) > 4 ? 3 : 0),
      11,
      "Show proprietary work — a repository or a sharp positioning line.",
    ),
    cat("Team readiness", Math.min(9, s.teamSize * 3), 9, "Two or more committed teammates."),
    cat(
      "Funding clarity",
      (s.fundingRequired > 0 ? 4 : 0) + (s.videoUrl ? 3 : 0) + (s.deckPath ? 3 : 0),
      8,
      "Name your raise, add a video pitch and a deck.",
    ),
  ];

  const score = breakdown.reduce((sum, c) => sum + c.score, 0);
  return { score: Math.min(100, score), breakdown };
}

export const readinessService = {
  async latest(startupId: string): Promise<ReadinessResult | null> {
    const { data, error } = await supabase
      .from("readiness_results")
      .select("*")
      .eq("startup_id", startupId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      score: data.score,
      breakdown: (data.breakdown ?? []) as unknown as ScoreCategory[],
      analysis: data.analysis,
      strengths: (data.strengths ?? []) as unknown as string[],
      weaknesses: (data.weaknesses ?? []) as unknown as string[],
      recommendations: (data.recommendations ?? []) as unknown as string[],
      provider: data.provider,
      version: data.version,
      generatedAt: data.generated_at,
    };
  },

  /** Scores with the rules, asks the model only for the written explanation, then stores the run. */
  async analyse(startup: StartupRecord): Promise<ReadinessResult> {
    const { score, breakdown } = scoreStartup(startup);
    let narrative: ReadinessNarrative;
    try {
      narrative = await explainReadiness({
        data: {
          name: startup.name,
          sector: startup.sector,
          stage: startup.stage,
          score,
          breakdown: breakdown.map((c) => ({ label: c.label, score: c.score, max: c.max })),
          problem: startup.problem,
          solution: startup.solution,
          businessModel: startup.businessModel,
          traction: startup.traction,
        },
      });
    } catch {
      narrative = {
        provider: "rules",
        analysis: `Scored ${score}/100 with the published rules.`,
        strengths: [],
        weaknesses: breakdown.filter((c) => c.score < c.max / 2).map((c) => c.label),
        recommendations: breakdown.filter((c) => c.score < c.max / 2).map((c) => c.hint),
      };
    }

    const row = {
      startup_id: startup.id,
      score,
      breakdown: breakdown as never,
      analysis: narrative.analysis,
      strengths: narrative.strengths as never,
      weaknesses: narrative.weaknesses as never,
      recommendations: narrative.recommendations as never,
      provider: narrative.provider,
      version: READINESS_VERSION,
    };
    const { data, error } = await supabase.from("readiness_results").insert(row).select("*").single();
    if (error) throw error;
    await supabase.from("startups").update({ readiness: score }).eq("id", startup.id);

    return {
      id: data.id,
      score,
      breakdown,
      analysis: narrative.analysis,
      strengths: narrative.strengths,
      weaknesses: narrative.weaknesses,
      recommendations: narrative.recommendations,
      provider: narrative.provider,
      version: READINESS_VERSION,
      generatedAt: data.generated_at,
    };
  },
};
