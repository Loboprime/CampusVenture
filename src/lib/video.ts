/** Safe embed handling for the video pitch: only YouTube and Vimeo are allowed. */
export interface VideoEmbed {
  provider: "youtube" | "vimeo";
  embedUrl: string;
}

export function parseVideoUrl(raw: string): VideoEmbed | null {
  const value = raw.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` };
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${id}` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id || !/^\d{5,12}$/.test(id)) return null;
    return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}
