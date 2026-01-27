import { api } from "./api";

export interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  item_type: string;
  effect_data: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseRequest {
  shop_item_id: number;
  quantity?: number;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  coins_remaining: number;
  item_name: string;
}

export interface InventoryItem {
  id: number;
  shop_item_id: number;
  shop_item_name: string;
  shop_item_description: string;
  shop_item_icon: string | null;
  quantity: number;
  purchased_at: string;
}

export const shopService = {
  async getItems(itemType?: string): Promise<ShopItem[]> {
    const params = itemType ? { item_type: itemType } : {};
    const response = await api.get<ShopItem[]>("/shop/items", { params });
    return response.data;
  },

  async purchase(request: PurchaseRequest): Promise<PurchaseResponse> {
    const response = await api.post<PurchaseResponse>("/shop/purchase", request);
    return response.data;
  },

  async getInventory(): Promise<InventoryItem[]> {
    const response = await api.get<InventoryItem[]>("/shop/inventory");
    return response.data;
  },
};
