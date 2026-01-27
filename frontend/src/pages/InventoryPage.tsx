import React, { useEffect } from "react";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { shopService, InventoryItem } from "../services/shop";
import { useApi } from "../hooks/useApi";
import "./InventoryPage.css";

function InventoryPageContent() {
  const inventoryApi = useApi(shopService.getInventory);

  useEffect(() => {
    inventoryApi.execute();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="inventory-page">
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
        <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Inventory</h1>
          <p style={{ color: "rgba(255, 255, 255, 0.72)", marginBottom: "32px" }}>
            Your purchased items and unlocks
          </p>

          <ErrorDisplay error={inventoryApi.error} />

          {inventoryApi.loading && <LoadingSpinner />}

          {!inventoryApi.loading && (!inventoryApi.data || inventoryApi.data.length === 0) && (
            <Card dark>
              <div className="inventory-empty">
                <p>Your inventory is empty. Visit the shop to purchase items!</p>
              </div>
            </Card>
          )}

          {!inventoryApi.loading && inventoryApi.data && inventoryApi.data.length > 0 && (
            <div className="inventory-grid">
              {inventoryApi.data.map((item) => (
                <Card key={item.id} dark className="inventory-item-card">
                  <div className="inventory-item-header">
                    {item.shop_item_icon && (
                      <span className="inventory-item-icon">{item.shop_item_icon}</span>
                    )}
                    <h3 className="inventory-item-name">{item.shop_item_name}</h3>
                  </div>
                  <p className="inventory-item-description">{item.shop_item_description}</p>
                  <div className="inventory-item-footer">
                    <div className="inventory-item-quantity">
                      Quantity: <strong>{item.quantity}</strong>
                    </div>
                    <div className="inventory-item-date">
                      Purchased: {formatDate(item.purchased_at)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryPageContent />
    </ProtectedRoute>
  );
}
