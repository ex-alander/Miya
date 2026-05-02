import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/profile");
    } catch (err: unknown) {
      setError("Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className="animate-fade-in"
        style={{ width: "100%", maxWidth: "420px" }}
      >
        <Card className="card-dark">
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "2.5rem",
                marginBottom: "8px",
                letterSpacing: "0.2px",
                background:
                  "linear-gradient(135deg, #F1DE9A 0%, #D6B25E 45%, #8A6A1F 120%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Miya
            </h1>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "1rem" }}>
              Welcome back.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dark
              required
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dark
              required
              placeholder="••••••••"
            />

            {error && <div className="alert alert-error">{error}</div>}

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              style={{ width: "100%", marginTop: "8px" }}
            >
              {submitting ? "Signing in..." : "Continue"}
            </Button>
          </form>

          <div
            style={{
              marginTop: "24px",
              textAlign: "center",
              paddingTop: "24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <p
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "0.875rem",
              }}
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{
                  color: "#D6B25E",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Create one
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
