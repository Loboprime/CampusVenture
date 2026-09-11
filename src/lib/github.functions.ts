import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({ url: z.string().trim().min(1).max(300) });

export interface RepoMetadata {
  ok: boolean;
  reason?: string;
  fullName?: string;
  description?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  language?: string;
  pushedAt?: string;
  htmlUrl?: string;
}

function parseRepo(raw: string): { owner: string; repo: string } | null {
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.hostname.replace(/^www\./, "") !== "github.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0]!;
  const repo = parts[1]!.replace(/\.git$/, "");
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  return { owner, repo };
}

/** Reads real public repository metadata from GitHub. Never fabricates numbers. */
export const fetchRepoMetadata = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<RepoMetadata> => {
    const parsed = parseRepo(data.url);
    if (!parsed) return { ok: false, reason: "That does not look like a public GitHub repository link." };

    try {
      const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "CampusVenture" },
      });
      if (response.status === 404) return { ok: false, reason: "Repository not found, private or deleted." };
      if (response.status === 403) return { ok: false, reason: "GitHub is rate limiting requests. Try again shortly." };
      if (!response.ok) return { ok: false, reason: `GitHub returned an error (${response.status}).` };
      const repo = (await response.json()) as Record<string, unknown>;
      return {
        ok: true,
        fullName: repo["full_name"] as string,
        description: (repo["description"] as string) ?? "",
        stars: (repo["stargazers_count"] as number) ?? 0,
        forks: (repo["forks_count"] as number) ?? 0,
        openIssues: (repo["open_issues_count"] as number) ?? 0,
        language: (repo["language"] as string) ?? "",
        pushedAt: (repo["pushed_at"] as string) ?? undefined,
        htmlUrl: (repo["html_url"] as string) ?? undefined,
      };
    } catch {
      return { ok: false, reason: "Could not reach GitHub just now." };
    }
  });
