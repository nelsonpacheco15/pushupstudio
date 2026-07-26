/* ============================================================================
   LAYOUT TEMPLATES
   Each layout is a horizontal band of columns; each column a vertical stack of
   tiles. `role` drives the review label; `seed` is a demo swatch so a band
   reads before real images are attached. To add a new layout (e.g. from one of
   your example stylescapes), copy a block below and give it a new key.
============================================================================ */

export type TileKind = "intro" | "logos" | "persona";

export interface TileTemplate {
  role: string;
  h: number;            // fraction of the column height (0..1)
  kind?: TileKind;
  seed?: string;        // placeholder colour before a real image is attached
}

export interface Column {
  w: number;            // pixel width of the column
  tiles: TileTemplate[];
}

export interface Layout {
  name: string;
  note: string;
  radius: number;
  personaSide: "left" | "right" | "center";
  palette: string[];    // default palette suggestion for this layout
  columns: Column[];
}

export const LAYOUTS: Record<string, Layout> = {
  editorial: {
    name: "Editorial",
    note: "Structured, authoritative. Dark intro, tight mosaic, sharp corners.",
    radius: 2,
    personaSide: "right",
    palette: ["#14130F", "#D2452B", "#E7E3D8", "#3A3730", "#B8B2A2"],
    columns: [
      { w: 300, tiles: [{ role: "Concept intro", kind: "intro", h: 1 }] },
      { w: 250, tiles: [{ role: "Stationery", h: 0.58, seed: "#2A2822" }, { role: "Business cards", h: 0.42, seed: "#D2452B" }] },
      { w: 190, tiles: [{ role: "Letterhead", h: 1, seed: "#E7E3D8" }] },
      { w: 360, tiles: [{ role: "Website", h: 0.55, seed: "#E7E3D8" }, { role: "Social post", h: 0.45, seed: "#3A3730" }] },
      { w: 210, tiles: [{ role: "Poster", h: 0.6, seed: "#D2452B" }, { role: "Product", h: 0.4, seed: "#2A2822" }] },
      { w: 260, tiles: [{ role: "Logo set", kind: "logos", h: 0.5, seed: "#E7E3D8" }, { role: "Texture", h: 0.5, seed: "#B8B2A2" }] },
      { w: 260, tiles: [{ role: "Persona", kind: "persona", h: 1, seed: "#3A3730" }] },
    ],
  },
  approachable: {
    name: "Approachable",
    note: "Warm, human. Persona leads, rounded corners, softer contrast.",
    radius: 14,
    personaSide: "left",
    palette: ["#0F3D3A", "#5FC2B0", "#F2F1EC", "#E8994E", "#1C1B18"],
    columns: [
      { w: 270, tiles: [{ role: "Persona", kind: "persona", h: 1, seed: "#0F3D3A" }] },
      { w: 300, tiles: [{ role: "Concept intro", kind: "intro", h: 1 }] },
      { w: 240, tiles: [{ role: "App screens", h: 0.62, seed: "#5FC2B0" }, { role: "Social post", h: 0.38, seed: "#F2F1EC" }] },
      { w: 320, tiles: [{ role: "Website", h: 0.5, seed: "#F2F1EC" }, { role: "Card design", h: 0.5, seed: "#0F3D3A" }] },
      { w: 200, tiles: [{ role: "Packaging", h: 0.55, seed: "#E8994E" }, { role: "Icon set", h: 0.45, seed: "#5FC2B0" }] },
      { w: 250, tiles: [{ role: "Logo set", kind: "logos", h: 0.5, seed: "#F2F1EC" }, { role: "Lifestyle", h: 0.5, seed: "#E8994E" }] },
    ],
  },
  bold: {
    name: "Bold",
    note: "High energy. Big type blocks, saturated colour, packaging-forward.",
    radius: 4,
    personaSide: "center",
    palette: ["#F2C41C", "#141414", "#F4F1EA", "#E5541F", "#2F6B3A"],
    columns: [
      { w: 280, tiles: [{ role: "Concept intro", kind: "intro", h: 1 }] },
      { w: 210, tiles: [{ role: "Poster", h: 0.55, seed: "#141414" }, { role: "Type study", h: 0.45, seed: "#F2C41C" }] },
      { w: 240, tiles: [{ role: "Packaging", h: 0.6, seed: "#E5541F" }, { role: "Social post", h: 0.4, seed: "#141414" }] },
      { w: 240, tiles: [{ role: "Persona", kind: "persona", h: 1, seed: "#2F6B3A" }] },
      { w: 300, tiles: [{ role: "Logo set", kind: "logos", h: 0.5, seed: "#F4F1EA" }, { role: "Website", h: 0.5, seed: "#F4F1EA" }] },
      { w: 210, tiles: [{ role: "Lifestyle", h: 0.5, seed: "#F2C41C" }, { role: "Merch", h: 0.5, seed: "#E5541F" }] },
    ],
  },
};

export type LayoutKey = keyof typeof LAYOUTS;

export interface FlatTile extends TileTemplate {
  id: string;   // stable "col-row" key, e.g. "3-1"
  col: number;
}

/** Flatten a layout into addressable tiles carrying a stable id. */
export function flattenTiles(layoutKey: string): FlatTile[] {
  const L = LAYOUTS[layoutKey];
  const out: FlatTile[] = [];
  L.columns.forEach((col, ci) =>
    col.tiles.forEach((t, ti) => out.push({ id: `${ci}-${ti}`, col: ci, ...t }))
  );
  return out;
}

/** Look up a tile's human role from its "col-row" key. */
export function roleForTileKey(layoutKey: string, key: string): string {
  const [ci, ti] = key.split("-").map(Number);
  return LAYOUTS[layoutKey]?.columns[ci]?.tiles[ti]?.role ?? key;
}

/** The full stylescape record the UI works with. */
export interface Stylescape {
  id: string;
  clientId: string | null;
  title: string;
  conceptNote: string;
  layoutKey: string;
  attributes: string[];
  palette: string[];
  shareToken: string;
  images: Record<string, string>; // tile_key -> public image url
}
