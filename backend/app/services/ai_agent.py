"""
AI Agent Service using Groq (replaces Google Gemini)
Handles text-to-deck generation and other AI features
"""
import json
import re
from typing import Any
from openai import OpenAI
from app.core.config import settings


class AIAgentService:
    """Service for AI-powered features using Groq."""

    def __init__(self):
        """Initialize Groq client."""
        if settings.GEMINI_API_KEY: 
            self.client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GEMINI_API_KEY, 
            )
            self.model = "llama-3.3-70b-versatile" 
        else:
            self.client = None
            self.model = None

    def is_available(self) -> bool:
        """Check if AI service is available."""
        return self.client is not None and settings.GEMINI_API_KEY != ""

    def generate_deck_from_text(
        self, text: str, deck_title: str | None = None
    ) -> dict[str, Any]:
        """
        Generate a deck with cards from input text using Groq AI.
        """
        if not self.is_available():
            raise ValueError("Groq API key not configured")

        prompt = f"""You are an expert flashcard creator. Analyze the following text and create a comprehensive deck of flashcards.

Text to analyze:
{text}

Create flashcards that:
1. Extract key concepts, facts, definitions, and important information
2. Create clear, concise question-answer pairs
3. Cover the most important points from the text
4. Use the front of the card for questions/concepts and the back for answers/details

Return your response as a JSON object with this exact structure:
{{
    "title": "Deck title (max 200 chars)",
    "description": "Brief description of the deck (max 1000 chars)",
    "cards": [
        {{
            "front_content": "Question or concept",
            "back_content": "Answer or explanation"
        }},
        ...
    ]
}}

Important:
- Generate 20 cards if the text is small and rise up to 25 cards if the text is very long
- Each card should be clear and focused on a single concept
- Front content should be concise (question or concept)
- Back content should provide a complete answer or explanation
- Return ONLY valid JSON, no markdown formatting, no code blocks
- Ensure all strings are properly escaped for JSON
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            
            response_text = response.choices[0].message.content.strip()

            response_text = re.sub(r"```json\n?", "", response_text)
            response_text = re.sub(r"```\n?", "", response_text)
            response_text = response_text.strip()

            deck_data = json.loads(response_text)

            if not isinstance(deck_data, dict):
                raise ValueError("Invalid response format")

            if "title" not in deck_data:
                deck_data["title"] = deck_title or "AI Generated Deck"

            if "description" not in deck_data:
                deck_data["description"] = f"Deck generated from text input"

            if "cards" not in deck_data or not isinstance(deck_data["cards"], list):
                raise ValueError("No cards generated")

            valid_cards = []
            for card in deck_data["cards"]:
                if (
                    isinstance(card, dict)
                    and "front_content" in card
                    and "back_content" in card
                ):
                    front = str(card["front_content"])[:5000]
                    back = str(card["back_content"])[:5000]
                    if front.strip() and back.strip():
                        valid_cards.append(
                            {
                                "front_content": front.strip(),
                                "back_content": back.strip(),
                            }
                        )

            if not valid_cards:
                raise ValueError("No valid cards generated")

            deck_data["cards"] = valid_cards
            return deck_data

        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"AI generation failed: {str(e)}")


ai_agent_service = AIAgentService()