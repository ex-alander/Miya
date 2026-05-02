import type { MentalMapWithNodes } from "../services/mentalMap";

export const MIYA_MAP_EXPORT_MARKER = "miyaMapExport" as const;

export type MapExportFileV1 = {
  [MIYA_MAP_EXPORT_MARKER]: true;
  version: 1;
  title: string;
  nodes: Array<{
    temp_id: number;
    parent_temp_id: number | null;
    title: string;
    description: string | null;
    x: number;
    y: number;
    order_index: number;
    mastery_state: string;
    node_type: string;
    source_ref: string | null;
  }>;
};

export function buildMapExportFile(map: MentalMapWithNodes): MapExportFileV1 {
  return {
    miyaMapExport: true,
    version: 1,
    title: map.title,
    nodes: map.nodes.map((n) => ({
      temp_id: n.id,
      parent_temp_id: n.parent_id,
      title: n.title,
      description: n.description ?? null,
      x: n.x,
      y: n.y,
      order_index: n.order_index,
      mastery_state: n.mastery_state,
      node_type: n.node_type ?? "simple",
      source_ref: n.source_ref ?? null,
    })),
  };
}

export function downloadMapFile(data: MapExportFileV1, baseName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${baseName.replace(/[^\w\-]+/g, "_") || "map"}.map`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function parseMapImportFile(text: string): {
  title: string;
  nodes: MapExportFileV1["nodes"];
} {
  const raw = JSON.parse(text) as unknown;
  if (!raw || typeof raw !== "object") throw new Error("Invalid file");
  const o = raw as Record<string, unknown>;
  if (o.miyaMapExport !== true || o.version !== 1) {
    throw new Error("Not a Miya .map file (version 1)");
  }
  if (typeof o.title !== "string" || !Array.isArray(o.nodes)) {
    throw new Error("Invalid map structure");
  }
  return {
    title: o.title,
    nodes: (o.nodes as Array<Record<string, unknown>>).map((n) => ({
      temp_id: Number(n.temp_id),
      parent_temp_id: n.parent_temp_id == null ? null : Number(n.parent_temp_id),
      title: String(n.title ?? ""),
      description: typeof n.description === "string" ? n.description : null,
      x: Number(n.x ?? 0),
      y: Number(n.y ?? 0),
      order_index: Number(n.order_index ?? 0),
      mastery_state: String(n.mastery_state ?? "unconquered"),
      node_type: String(n.node_type ?? "simple"),
      source_ref: typeof n.source_ref === "string" ? n.source_ref : null,
    })),
  };
}
