import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  name: z.string().max(120),
  sector: z.string().max(60),
  stage: z.string().max(40),
  score: z.number().min(0).max(100),
  breakdown: z
    .array(z.object({ label: z.string().max(60), score: z.number(), max: z.number() }))
    .max(20),
  problem: z.string().max(2000),
  solution: z.string().max(2000),
  businessModel: z.string().max(1000),
  traction: z.string().max(1000),
});

export interface ReadinessNarrative {
  provider: "ai" | "rules";
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

function fallback(data: z.infer<typeof inputSchema>): ReadinessNarrative {
  const sorted = [...data.breakdown].sort((a, b) => b.score / b.max - a.score / a.max);
  const strengths = sorted.slice(0, 3).filter((c) => c.score > 0).map((c) => `${c.label} is well covered.`);
  const weak = [...sorted].reverse().slice(0, 3);
  return {
    provider: "rules",
    analysis:
      `Scored ${data.score}/100 against the nine CampusVenture readiness categories. ` +
      `This score comes from the published rules below, not from a language model.`,
    strengths: strengths.length ? strengths : ["Profile started — keep filling in the sections."],
    weaknesses: weak.map((c) => `${c.label} needs more detail.`),
    recommendations: weak.map((c) => `Add specifics for ${c.label.toLowerCase()}.`),
  };
}

/**
 * Turns the rule-based score into a written explanation. The score itself is
 * always calculated by the transparent rules — the model only writes commentary,
 * and the rules-based text is used whenever the model is unavailable.
 */
export const explainReadiness = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ReadinessNarrative> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return fallback(data);
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3.8-flash",
          messages: [
            {
              role: "system",
              content:
                "You advise student founders. You are given a startup profile and a score that was already " +
                "calculated by fixed rules. Never invent metrics and never change the score. Reply with JSON: " +
                '{"analysis":string,"strengths":string[],"weaknesses":string[],"recommendations":string[]}. ' +
                "Keep each list to at most four short, concrete items.",
            },
            { role: "user", content: JSON.stringify(data) },
          ],
        }),
      });
      if (!response.ok) return fallback(data);
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as Partial<ReadinessNarrative>;
      return {
        provider: "ai",
        analysis: parsed.analysis ?? fallback(data).analysis,
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        recommendations: parsed.recommendations ?? [],
      };
    } catch {
      return fallback(data);
    }
  });
