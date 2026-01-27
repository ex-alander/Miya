import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";
import { useToast } from "../components/ui/ToastProvider";
import { aiService, AIStatus } from "../services/ai";
import { useApi } from "../hooks/useApi";
import "./AIAgentPage.css";

function AIAgentPageContent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  const statusApi = useApi(aiService.getStatus);
  const generateApi = useApi(aiService.generateDeckFromText);

  useEffect(() => {
    statusApi.execute().then((status) => {
      if (status) setAiStatus(status);
    });
  }, []);

  const handleGenerate = async () => {
    if (!text.trim() || text.trim().length < 10) {
      showToast("Please enter at least 10 characters of text", "error");
      return;
    }

    const result = await generateApi.execute(text, deckTitle || null);
    if (result) {
      showToast(result.message, "success");
      navigate(`/decks/${result.deck_id}`);
    }
  };

  const exampleTexts = [
    {
      title: "History Example",
      text: "The Renaissance was a period in European history from the 14th to the 17th century. It marked the transition from the Middle Ages to Modernity. Key figures include Leonardo da Vinci, Michelangelo, and Galileo. The movement began in Italy and spread throughout Europe.",
    },
    {
      title: "Science Example",
      text: "Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in chloroplasts and involves two main stages: light-dependent reactions and light-independent reactions (Calvin cycle). The overall equation is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2.",
    },
    {
      title: "Language Learning Example",
      text: "Spanish verb conjugations: Hablar (to speak) - Yo hablo, Tú hablas, Él/Ella habla, Nosotros hablamos, Vosotros habláis, Ellos/Ellas hablan. Comer (to eat) - Yo como, Tú comes, Él/Ella come, Nosotros comemos, Vosotros coméis, Ellos/Ellas comen.",
    },
  ];

  const loadExample = (exampleText: string) => {
    setText(exampleText);
  };

  return (
    <div className="ai-agent-page">
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
        <div className="animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "2.25rem", marginBottom: "8px" }}>Moto</h1>
            <p style={{ color: "rgba(255, 255, 255, 0.72)" }}>
              Paste any text and let Moto create a deck of flashcards for you!
            </p>
            {aiStatus && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: aiStatus.available
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${aiStatus.available ? "#22c55e" : "#ef4444"}`,
                  borderRadius: "var(--radius-md)",
                  color: aiStatus.available ? "#22c55e" : "#ef4444",
                  fontSize: "0.875rem",
                }}
              >
                {aiStatus.available
                  ? "✓ AI service is available"
                  : "✗ AI service is not configured. Please set GROQ_API_KEY in backend .env file."}
              </div>
            )}
          </div>

          <Card className="card-dark" style={{ marginBottom: "24px" }}>
            <h2 style={{ marginBottom: "20px", fontSize: "1.5rem" }}>Generate Deck from Text</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Input
                label="Deck Title (Optional)"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                dark
                placeholder="Leave empty for AI-generated title"
                maxLength={200}
              />

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    color: "rgba(255, 255, 255, 0.9)",
                    fontWeight: 600,
                  }}
                >
                  Text Content *
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste or type your text here... (minimum 10 characters)"
                  className="ai-textarea"
                  rows={12}
                  maxLength={35000}
                />
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.875rem",
                    color: "rgba(255, 255, 255, 0.6)",
                  }}
                >
                  {text.length} / 35,000 characters
                </div>
              </div>

              <ErrorDisplay error={generateApi.error} />

              <div style={{ display: "flex", gap: "12px" }}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={generateApi.loading || !aiStatus?.available || text.trim().length < 10}
                  style={{ flex: 1 }}
                >
                  {generateApi.loading ? (
                    <>
                      <LoadingSpinner size="sm" style={{ marginRight: "8px" }} />
                      Generating...
                    </>
                  ) : (
                    "Generate Deck"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setText("");
                    setDeckTitle("");
                  }}
                  disabled={generateApi.loading}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>

          <Card className="card-dark">
            <h3 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>Example Texts</h3>
            <p style={{ marginBottom: "16px", color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem" }}>
              Try these examples to see how the AI works:
            </p>
            <div className="example-grid">
              {exampleTexts.map((example, idx) => (
                <button
                  key={idx}
                  className="example-card"
                  onClick={() => loadExample(example.text)}
                  disabled={generateApi.loading}
                >
                  <div className="example-title">{example.title}</div>
                  <div className="example-preview">
                    {example.text.substring(0, 100)}...
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="card-dark" style={{ marginTop: "24px" }}>
            <h3 style={{ marginBottom: "12px", fontSize: "1.25rem" }}>How it works</h3>
            <ul className="how-it-works">
              <li>Paste any text content (articles, notes, textbook excerpts, etc.)</li>
              <li>Optionally provide a title for your deck</li>
              <li>AI analyzes the text and extracts key concepts</li>
              <li>Creates flashcards with questions on the front and answers on the back</li>
              <li>Your new deck will be ready to study immediately!</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AIAgentPage() {
  return (
    <ProtectedRoute>
      <AIAgentPageContent />
    </ProtectedRoute>
  );
}
