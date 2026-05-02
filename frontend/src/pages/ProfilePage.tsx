import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { User } from "../services/auth";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!user) return null;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await api.patch<User>("/users/me", { username, email });
      await refreshMe();
      setOk("Profile updated successfully!");
    } catch (err: unknown) {
      setError("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const memberSince = new Date(user.created_at);
  const daysSince = Math.floor(
    (Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div
      className="container"
      style={{ paddingTop: "32px", paddingBottom: "32px" }}
    >
      <div className="animate-fade-in">
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "2.5rem",
              marginBottom: "8px",
              background: "linear-gradient(135deg, #F1DE9A 0%, #D6B25E 45%, #B8860B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              borderBottom: "1px solid rgba(214, 178, 94, 0.3)",
              display: "inline-block",
              paddingBottom: "8px",
            }}
          >
            Your Profile
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "1rem" }}>
            Manage your account and track your progress
          </p>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            value={user.xp.toLocaleString()}
            label="Total XP"
            icon={<span style={{ fontSize: "1.5rem" }}>⚡</span>}
          />
          <StatCard
            value={user.coins.toLocaleString()}
            label="Coins"
            icon={<span style={{ fontSize: "1.5rem" }}>💰</span>}
          />
          <div
            className="stat-card"
            style={{
              background: "linear-gradient(135deg, #2A1A0E 0%, #3A2418 50%, #2A1A0E 100%)",
              border: "1px solid rgba(214, 178, 94, 0.4)",
              color: "#D6B25E",
            }}
          >
            <div style={{ marginBottom: "8px", fontSize: "1.5rem" }}>🔥</div>
            <div className="stat-value">{daysSince}</div>
            <div className="stat-label" style={{ color: "#F1DE9A" }}>Days Learning</div>
          </div>
        </div>

        {/* Profile Form */}
        <Card className="card-dark">
          <h2 style={{ marginBottom: "24px", fontSize: "1.5rem" }}>
            Account Settings
          </h2>

          <form
            onSubmit={onSave}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dark
              placeholder="your@email.com"
            />
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dark
              minLength={3}
              placeholder="Your username"
            />

            {error && <div className="alert alert-error">{error}</div>}

            {ok && <div className="alert alert-success">{ok}</div>}

            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <Button type="submit" disabled={saving} size="lg">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Quick Actions */}
        <Card className="card-dark" style={{ marginTop: "24px" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>
            Quick Actions
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link to="/shop">
              <Button variant="primary" size="sm">
                Visit Shop
              </Button>
            </Link>
            <Link to="/inventory">
              <Button variant="secondary" size="sm">
                My Inventory
              </Button>
            </Link>
            <Link to="/decks">
              <Button variant="secondary" size="sm">
                My Decks
              </Button>
            </Link>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="card-dark" style={{ marginTop: "24px" }}>
          <h3 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>
            Account Information
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Member since</span>
              <Badge variant="gold">
                {memberSince.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Badge>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>User ID</span>
              <code
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                }}
              >
                {user.id}
              </code>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
