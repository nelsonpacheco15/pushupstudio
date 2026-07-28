/** Find Notion links inside free text (brief, references). */
const NOTION_RE = /https?:\/\/(?:[\w-]+\.)?notion\.(?:so|site)\/[^\s)"']+|https?:\/\/app\.notion\.com\/[^\s)"']+/gi;

export function extractNotionLinks(...texts: (string | null | undefined)[]): string[] {
  const found: string[] = [];
  for (const t of texts) if (t) found.push(...(t.match(NOTION_RE) ?? []));
  return [...new Set(found.map((u) => u.replace(/[.,;]+$/, "")))];
}

/** Best-effort page title from a Notion URL slug (strips the trailing 32-hex id). */
export function notionTitle(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    const slug = last.replace(/-?[0-9a-f]{32}$/i, "").replace(/-/g, " ").trim();
    return slug ? decodeURIComponent(slug) : "Notion page";
  } catch { return "Notion page"; }
}

/** Public notion.site pages can be embedded in an iframe; private app.notion.com links cannot. */
export function isNotionEmbeddable(url: string): boolean {
  try { return /\.notion\.site$/i.test(new URL(url).hostname); } catch { return false; }
}
