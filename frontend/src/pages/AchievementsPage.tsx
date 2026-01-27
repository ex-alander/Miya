import React, { useEffect } from "react";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { Card } from "../components/ui/Card";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { achievementService, Achievement } from "../services/achievements";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import "./AchievementsPage.css";

function AchievementsPageContent() {
  const { user } = useAuth();
  const achievementsApi = useApi(achievementService.getAll);

  useEffect(() => {
    achievementsApi.execute();
  }, []);

  const isUnlocked = (achievement: Achievement) => {
    return achievement.unlocked || (user && user.xp >= achievement.xp_required);
  };

  return (
    <div className="achievements-page">
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
        <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Achievements</h1>
            <p style={{ color: "rgba(255, 255, 255, 0.72)" }}>
              Unlock achievements by reaching milestones! Some are secret... 👀
            </p>
            {user && (
              <div style={{ marginTop: "16px" }}>
                <div className="achievements-xp-display">
                  <span className="xp-label">Your XP:</span>
                  <span className="xp-value">{user.xp.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <ErrorDisplay error={achievementsApi.error} />

          {achievementsApi.loading && <LoadingSpinner />}

          {!achievementsApi.loading && (!achievementsApi.data || achievementsApi.data.length === 0) && (
            <Card dark>
              <div className="achievements-empty">
                <p>No achievements available yet.</p>
              </div>
            </Card>
          )}

          {!achievementsApi.loading && achievementsApi.data && achievementsApi.data.length > 0 && (
            <div className="achievements-grid">
              {achievementsApi.data.map((achievement) => {
                const unlocked = isUnlocked(achievement);
                return (
                  <Card
                    key={achievement.id}
                    dark
                    className={`achievement-card ${unlocked ? "unlocked" : "locked"}`}
                  >
                    <div className="achievement-header">
                      {achievement.icon && (
                        <span className={`achievement-icon ${unlocked ? "" : "dimmed"}`}>
                          {achievement.icon}
                        </span>
                      )}
                      {achievement.is_secret && !unlocked && (
                        <span className="secret-badge">🔒 Secret</span>
                      )}
                    </div>
                    <h3 className={`achievement-name ${unlocked ? "" : "dimmed"}`}>
                      {achievement.is_secret && !unlocked ? "???" : achievement.name}
                    </h3>
                    <p className={`achievement-description ${unlocked ? "" : "dimmed"}`}>
                      {achievement.is_secret && !unlocked
                        ? "Unlock this achievement to reveal its description!"
                        : achievement.description}
                    </p>
                    <div className="achievement-footer">
                      <div className={`achievement-xp ${unlocked ? "" : "dimmed"}`}>
                        Requires: {achievement.xp_required.toLocaleString()} XP
                      </div>
                      {unlocked && (
                        <div className="achievement-unlocked-badge">✓ Unlocked</div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <AchievementsPageContent />
    </ProtectedRoute>
  );
}
