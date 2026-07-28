import { notionTitle, isNotionEmbeddable } from "@/lib/links";

/* Clean, light "Notion" reference card (matches a polished job-card aesthetic):
   icon + page title + tags + an Open-in-Notion action. Embeds public pages inline. */
export default function NotionEmbed({ url }: { url: string }) {
  const title = notionTitle(url);
  const embeddable = isNotionEmbeddable(url);

  const chip = (label: string): React.CSSProperties => ({
    display: "inline-block", background: "#F3F4F2", color: "#3f3f3a", borderRadius: 8,
    padding: "6px 11px", fontSize: 12, fontWeight: 600,
  });

  return (
    <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 10px 30px rgba(0,0,0,0.28)", overflow: "hidden", color: "#1a1a17" }}>
      <div style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ width: 46, height: 46, borderRadius: 999, border: "1px solid #e6e6e2", display: "flex",
            alignItems: "center", justifyContent: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 24 }}>N</div>
          <span style={{ ...chip("Reference"), display: "inline-flex", alignItems: "center", gap: 6 }}>Reference 🔖</span>
        </div>

        <div style={{ marginTop: 18, fontSize: 13, color: "#8a8a82", fontWeight: 600 }}>Notion</div>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.2, marginTop: 2, wordBreak: "break-word" }}>{title}</div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <span style={chip("Brief")}>Brief</span>
          <span style={chip(embeddable ? "Embedded" : "External page")}>{embeddable ? "Live preview" : "Shared link"}</span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #efefe9", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12.5, color: "#9a9a92" }}>{embeddable ? "Preview below" : "Opens in Notion"}</span>
        <a href={url} target="_blank" rel="noreferrer"
          style={{ background: "#111", color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
          Open in Notion ↗
        </a>
      </div>

      {embeddable && (
        <iframe src={url} title={title}
          style={{ width: "100%", height: 460, border: "none", borderTop: "1px solid #efefe9", background: "#fff", display: "block" }} />
      )}
    </div>
  );
}
