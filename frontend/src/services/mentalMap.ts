import { api } from "./api";

export type MasteryState = "unconquered" | "in_progress" | "mastered";

export type NodeType = "simple" | "deck";

export interface MentalMapNode {
  id: number;
  map_id: number;
  parent_id: number | null;
  title: string;
  description?: string | null;
  x: number;
  y: number;
  order_index: number;
  mastery_state: MasteryState;
  node_type: NodeType;
  deck_id: number | null;
  source_ref?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentalMap {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MentalMapWithNodes extends MentalMap {
  nodes: MentalMapNode[];
}

export interface MentalMapNodeCreate {
  title?: string;
  description?: string | null;
  x: number;
  y: number;
  parent_id?: number | null;
  order_index?: number;
  mastery_state?: MasteryState;
  node_type?: NodeType;
  source_ref?: string | null;
}

export interface MentalMapNodeUpdate {
  title?: string;
  description?: string | null;
  x?: number;
  y?: number;
  parent_id?: number | null;
  order_index?: number;
  mastery_state?: MasteryState;
  node_type?: NodeType;
  source_ref?: string | null;
}

export type MentalMapImportNodeRow = {
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
};

export const mentalMapService = {
  async list(): Promise<MentalMap[]> {
    const r = await api.get<MentalMap[]>("/mental-maps");
    return r.data;
  },

  async getWithNodes(mapId: number): Promise<MentalMapWithNodes> {
    const r = await api.get<MentalMapWithNodes>(`/mental-maps/${mapId}`);
    return r.data;
  },

  async getTree(): Promise<MentalMapWithNodes[]> {
    const r = await api.get<MentalMapWithNodes[]>("/mental-maps/tree");
    return r.data;
  },

  async create(data: { title?: string }): Promise<MentalMap> {
    const r = await api.post<MentalMap>("/mental-maps", data ?? {});
    return r.data;
  },

  async update(mapId: number, data: { title?: string }): Promise<MentalMap> {
    const r = await api.patch<MentalMap>(`/mental-maps/${mapId}`, data);
    return r.data;
  },

  async delete(mapId: number): Promise<void> {
    await api.delete(`/mental-maps/${mapId}`);
  },

  async createNode(
    mapId: number,
    data: MentalMapNodeCreate
  ): Promise<MentalMapNode> {
    const r = await api.post<MentalMapNode>(
      `/mental-maps/${mapId}/nodes`,
      data
    );
    return r.data;
  },

  async updateNode(
    mapId: number,
    nodeId: number,
    data: MentalMapNodeUpdate
  ): Promise<MentalMapNode> {
    const r = await api.patch<MentalMapNode>(
      `/mental-maps/${mapId}/nodes/${nodeId}`,
      data
    );
    return r.data;
  },

  async deleteNode(mapId: number, nodeId: number): Promise<void> {
    await api.delete(`/mental-maps/${mapId}/nodes/${nodeId}`);
  },

  async importMap(payload: {
    title: string;
    nodes: MentalMapImportNodeRow[];
  }): Promise<MentalMapWithNodes> {
    const r = await api.post<MentalMapWithNodes>("/mental-maps/import", payload);
    return r.data;
  },

  async generateFromText(payload: {
    text: string;
    title?: string;
  }): Promise<MentalMapWithNodes> {
    const r = await api.post<MentalMapWithNodes>(
      "/mental-maps/generate-from-text",
      payload
    );
    return r.data;
  },
};
