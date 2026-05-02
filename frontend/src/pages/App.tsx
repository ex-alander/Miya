import React from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ProfilePage from "./ProfilePage";
import DecksPage from "./DecksPage";
import DeckDetailPage from "./DeckDetailPage";
import StudyPage from "./StudyPage";
import ShopPage from "./ShopPage";
import InventoryPage from "./InventoryPage";
import AchievementsPage from "./AchievementsPage";
import AIAgentPage from "./AIAgentPage";
import ImportExportPage from "./ImportExportPage";
import BattlefieldPage from "./BattlefieldPage";
import PomodoroPage from "./PomodoroPage";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Download } from "lucide-react";

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Don't show nav on auth pages
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Navigation Header */}
      <header
        style={{
          background:
            "linear-gradient(180deg, rgba(18, 8, 7, 0.85) 0%, rgba(42, 20, 16, 0.55) 100%)",
          borderBottom: "1px solid rgba(214, 178, 94, 0.18)",
          padding: "16px 0",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "0.2px",
                background:
                  "linear-gradient(135deg, #F1DE9A 0%, #D6B25E 45%, #8A6A1F 120%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Miya
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link
              to="/"
              className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
            >
              Home
            </Link>
            {user && (
              <>
                <Link
                  to="/battlefield"
                  className={`nav-link ${location.pathname.startsWith("/battlefield") ? "active" : ""}`}
                >
                  Maps
                </Link>
                                            {/*COMMENTED OUT FOR DEMO*/}
                {/* <Link
                  to="/ai-agent"
                  className={`nav-link ${location.pathname === "/ai-agent" ? "active" : ""}`}
                >
                  Moto
                </Link> */}
                <Link
                  to="/shop"
                  className={`nav-link ${location.pathname === "/shop" ? "active" : ""}`}
                >
                  Shop
                </Link>
                <Link
                  to="/achievements"
                  className={`nav-link ${location.pathname === "/achievements" ? "active" : ""}`}
                >
                  Achievements
                </Link>
                                           {/*COMMENTED OUT FOR DEMO*/}
                {/* <Link
                  to="/focus"
                  className={`nav-link ${location.pathname === "/focus" ? "active" : ""}`}
                >
                  Focus
                </Link> */}
                <Link
                  to="/import-export"
                  className={`nav-link nav-link-icon ${location.pathname === "/import-export" ? "active" : ""}`}
                  title="Import"
                  style={{ marginLeft: "auto" }}
                >
                  <Download size={18} />
                </Link>
                <Link
                  to="/profile"
                  className={`nav-link ${location.pathname === "/profile" ? "active" : ""}`}
                >
                  Profile
                </Link>
              </>
            )}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {user ? (
              <>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Badge variant="gold">{user.xp} XP</Badge>
                    <Badge variant="orange">{user.coins} 💰</Badge>
                  </div>
                  <span
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {user.username}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              <div
                className="container"
                style={{ paddingTop: "48px", paddingBottom: "48px" }}
              >
                <div
                  className="animate-fade-in"
                  style={{ maxWidth: 920, margin: "0 auto" }}
                >
                  <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <h1
                      style={{
                        fontSize: "3.1rem",
                        marginBottom: "14px",
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
                    <p
                      style={{
                        fontSize: "1.05rem",
                        color: "rgba(255, 255, 255, 0.78)",
                        margin: "0 auto",
                        maxWidth: 560,
                        lineHeight: 1.7,
                      }}
                    >
                      A calm, focused place to learn. Everything you need is
                      organized inside your maps.
                    </p>
                  </div>

                  {!user ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "center",
                      }}
                    >
                      <Link to="/register">
                        <Button size="lg">Create account</Button>
                      </Link>
                      <Link to="/login">
                        <Button variant="secondary" size="lg">
                          Sign in
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Link to="/battlefield">
                        <Button size="lg">Go to Maps</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/decks"
            element={
              <ProtectedRoute>
                <DecksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/decks/:deckId"
            element={
              <ProtectedRoute>
                <DeckDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study/:deckId?"
            element={
              <ProtectedRoute>
                <StudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shop"
            element={
              <ProtectedRoute>
                <ShopPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-agent"
            element={
              <ProtectedRoute>
                <AIAgentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battlefield"
            element={
              <ProtectedRoute>
                <BattlefieldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battlefield/:mapId"
            element={
              <ProtectedRoute>
                <BattlefieldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import-export"
            element={
              <ProtectedRoute>
                <ImportExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/focus"
            element={
              <ProtectedRoute>
                <PomodoroPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer
        style={{
          background: "rgba(18, 8, 7, 0.35)",
          padding: "24px 0",
          marginTop: "auto",
          borderTop: "1px solid rgba(214, 178, 94, 0.12)",
        }}
      >
        <div
          className="container"
          style={{
            textAlign: "center",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: "0.875rem",
          }}
        >
          <p>Quiet progress, steady craft.</p>
        </div>
      </footer>
    </div>
  );
}