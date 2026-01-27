import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { shopService, ShopItem } from "../services/shop";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { useAuth } from "../contexts/AuthContext";
import "./ShopPage.css";

function ShopPageContent() {
  const { user, refreshMe } = useAuth();
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [purchaseItem, setPurchaseItem] = useState<ShopItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  const itemsApi = useApi(shopService.getItems);
  const purchaseApi = useApi(shopService.purchase);

  useEffect(() => {
    loadItems();
  }, [selectedType]);

  const loadItems = async () => {
    await itemsApi.execute(selectedType || undefined);
  };

  const handlePurchase = async () => {
    if (!purchaseItem) return;

    const result = await purchaseApi.execute({
      shop_item_id: purchaseItem.id,
      quantity,
    });

    if (result) {
      showToast(result.message, "success");
      await refreshMe();
      setPurchaseItem(null);
      setQuantity(1);
    }
  };

  const filteredItems = itemsApi.data || [];

  return (
    <div className="shop-page">
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
        <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Shop</h1>
            <p style={{ color: "rgba(255, 255, 255, 0.72)" }}>
              Spend your coins on boosts, cosmetics, and unlocks!
            </p>
            {user && (
              <div style={{ marginTop: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                <div className="shop-balance">
                  <span className="balance-label">Your Coins:</span>
                  <span className="balance-value">{user.coins} 💰</span>
                </div>
              </div>
            )}
          </div>

          <div className="shop-filters">
            <Button
              variant={selectedType === null ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              All Items
            </Button>
            <Button
              variant={selectedType === "boost" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedType("boost")}
            >
              Boosts
            </Button>
            <Button
              variant={selectedType === "cosmetic" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedType("cosmetic")}
            >
              Cosmetics
            </Button>
            <Button
              variant={selectedType === "unlock" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedType("unlock")}
            >
              Unlocks
            </Button>
          </div>

          <ErrorDisplay error={itemsApi.error || purchaseApi.error} />

          {itemsApi.loading && <LoadingSpinner />}

          {!itemsApi.loading && filteredItems.length === 0 && (
            <div className="shop-empty">
              <p>No items available in this category.</p>
            </div>
          )}

          {!itemsApi.loading && filteredItems.length > 0 && (
            <div className="shop-grid">
              {filteredItems.map((item) => (
                <Card key={item.id} dark className="shop-item-card">
                  <div className="shop-item-header">
                    {item.icon && <span className="shop-item-icon">{item.icon}</span>}
                    <h3 className="shop-item-name">{item.name}</h3>
                  </div>
                  <p className="shop-item-description">{item.description}</p>
                  <div className="shop-item-footer">
                    <div className="shop-item-price">
                      <span className="price-value">{item.price}</span>
                      <span className="price-label">💰 coins</span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setPurchaseItem(item)}
                      disabled={Boolean(user && user.coins < item.price)}
                    >
                      Buy
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={purchaseItem !== null}
        title={`Purchase ${purchaseItem?.name}`}
        message={
          purchaseItem
            ? `Buy ${quantity}x ${purchaseItem.name} for ${purchaseItem.price * quantity} coins?`
            : ""
        }
        confirmText="Purchase"
        cancelText="Cancel"
        variant="default"
        onConfirm={handlePurchase}
        onCancel={() => {
          setPurchaseItem(null);
          setQuantity(1);
        }}
      />
    </div>
  );
}

export default function ShopPage() {
  return (
    <ProtectedRoute>
      <ShopPageContent />
    </ProtectedRoute>
  );
}
