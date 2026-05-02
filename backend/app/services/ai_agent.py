"""
AI Agent Service using Groq (replaces Google GROQ)
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
        if settings.GROQ_API_KEY: 
            self.client = OpenAI(
                base_url="https://api.proxyapi.ru/openai/v1",
                api_key=settings.PROXY_API_KEY, 
            )
            self.model = "gpt-4o-mini"
        else:
            self.client = None
            self.model = None

    def is_available(self) -> bool:
        """Check if AI service is available."""
        return self.client is not None and settings.GROQ_API_KEY != ""

    def generate_deck_from_text(
        self, text: str, deck_title: str | None = None
    ) -> dict[str, Any]:
        """
        Generate a deck with cards from input text using Groq AI.
        """
        if not self.is_available():
            raise ValueError("Groq API key not configured")

        prompt = f"""ROLE: You are a meticulous educational content extractor. Your task is to convert RUSSIAN textbook material into exhaustive RUSSIAN flashcards. You must extract EVERY SINGLE important fact.

TEXT TO PROCESS (IN RUSSIAN):
{text}

ABSOLUTELY CRITICAL RULES:
1.  LANGUAGE: All output text MUST be in RUSSIAN. 'source' must contain the exact original Russian quote.
2.  COMPREHENSIVE COVERAGE: Extract EVERY fact from the text. Do not skip anything. Prioritize quantity and completeness over brevity.
3.  OUTPUT FORMAT: Return ONLY a valid JSON object matching this exact structure:
{{
  "title": "Краткое название колоды (до 7 слов)",
  "description": "Колода, сгенерированная из текста",
  "cards": [
    {{
      "front_content": "Четкий вопрос или термин (до 12 слов)",
      "back_content": {{
        "answer": "Точный ответ или определение (до 25 слов)",
        "source": "Прямая цитата из текста (до 20 слов)",
        "context": "Роль или связь этого факта в тексте (до 30 слов)"
      }}
    }}
  ]
}}
4.  CONTENT RULES:
    - One card = one atomic fact. Split complex sentences into multiple cards.
    - If a fact has multiple parts (e.g., "3 components: A, B, C"), create separate cards for each part.
    - 'context' must explain WHY this specific fact matters in the logical flow of the text.

FACT TAXONOMY (MUST COVER ALL TYPES):
A. DEFINITIONS: Formal definitions of terms, concepts, laws.
B. ENTITIES: Named people, places, organizations, dates, numbers.
C. PROPERTIES: Characteristics, features, attributes of entities.
D. PROCESSES: Steps, stages, sequences, causes and effects.
E. RELATIONSHIPS: Comparisons, contrasts, hierarchies, dependencies.
F. CONCLUSIONS: Main findings, outcomes, implications stated by the author.

INSTRUCTIONS:
1.  Read the text sentence by sentence. For each sentence, identify ALL facts that match the taxonomy above.
2.  For each fact, create a separate flashcard.
3.  Do NOT group facts. Do NOT summarize.
4.  If the text mentions a list (e.g., "three components: X, Y, Z"), create cards:
    - Card 1: "Первый компонент: X"
    - Card 2: "Второй компонент: Y"
    - Card 3: "Третий компонент: Z"
5.  Include even seemingly obvious facts if they are explicitly stated.

EXAMPLE OUTPUT FOR A SHORT TEXT:
Text: "Фотосинтез — процесс образования органических веществ из углекислого газа и воды на свету. Основные пигменты: хлорофилл a и хлорофилл b. Происходит в хлоропластах."

Expected cards:
{{
  "title": "Фотосинтез: основы",
  "description": "Колода, сгенерированная из текста",
  "cards": [
    {{
      "front_content": "Что такое фотосинтез?",
      "back_content": {{
        "answer": "Процесс образования органических веществ из углекислого газа и воды на свету.",
        "source": "Фотосинтез — процесс образования органических веществ из углекислого газа и воды на свету.",
        "context": "Это ключевое определение всего процесса."
      }}
    }},
    {{
      "front_content": "Основной пигмент фотосинтеза 1",
      "back_content": {{
        "answer": "Хлорофилл a.",
        "source": "Основные пигменты: хлорофилл a и хлорофилл b.",
        "context": "Один из двух основных светопоглощающих пигментов."
      }}
    }},
    {{
      "front_content": "Основной пигмент фотосинтеза 2",
      "back_content": {{
        "answer": "Хлорофилл b.",
        "source": "Основные пигменты: хлорофилл a и хлорофилл b.",
        "context": "Второй основной пигмент, дополняющий хлорофилл a."
      }}
    }},
    {{
      "front_content": "Где происходит фотосинтез?",
      "back_content": {{
        "answer": "В хлоропластах.",
        "source": "Происходит в хлоропластах.",
        "context": "Указывает на конкретную органеллу-место процесса."
      }}
    }}
  ]
}}

Now, process the TEXT TO PROCESS above. Extract EVERY fact. Return ONLY the JSON object."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200000
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
            for card in deck_data.get("cards", []):
                # Проверяем базовую структуру карточки
                if not isinstance(card, dict):
                    continue
                    
                front_content = card.get("front_content", "")
                back_content = card.get("back_content", {})
                
                # Проверяем наличие обязательных полей
                if not front_content or not back_content:
                    continue
                
                # Обрабатываем front_content
                front = str(front_content)[:500].strip()
                if not front:
                    continue
                
                # Обрабатываем back_content - теперь это объект, а не строка
                if isinstance(back_content, dict):
                    # Извлекаем поля из структурированного объекта
                    answer = str(back_content.get("answer", ""))[:300].strip()
                    source = str(back_content.get("source", ""))[:300].strip()
                    context = str(back_content.get("context", ""))[:300].strip()
                    
                    # Формируем красивый многострочный back_content для отображения
                    back_parts = []
                    if answer:
                        back_parts.append(f"Ответ: {answer}")
                    if source:
                        # Убираем лишние кавычки если они есть
                        clean_source = source.strip('"').strip("'").strip()
                        back_parts.append(f"Источник: {clean_source}")
                    if context:
                        back_parts.append(f"Контекст: {context}")
                    
                    back = "\n\n".join(back_parts)
                
                elif isinstance(back_content, str):
                    # Совместимость со старым форматом (если модель вдруг вернёт строку)
                    back = back_content[:5000].strip()
                else:
                    continue
                
                if back:
                    valid_cards.append({
                        "front_content": front,
                        "back_content": back,
                    })

            if not valid_cards:
                raise ValueError("AI не сгенерировал ни одной валидной карточки")

            # Обновляем данные колоды
            deck_data["cards"] = valid_cards

            # Убеждаемся, что у нас есть название и описание
            if not deck_data.get("title"):
                deck_data["title"] = deck_title or "AI Generated Deck"
                
            if not deck_data.get("description"):
                deck_data["description"] = f"Колода, сгенерированная из текста"

            return deck_data
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"AI generation failed: {str(e)}")

    def generate_mental_map_from_text(
        self, text: str, map_title: str | None = None
    ) -> dict[str, Any]:
        """Extract a hierarchical concept map (nodes + parent links) as JSON."""
        if not self.is_available():
            raise ValueError("Groq API key not configured")

        snippet = text[:80000]
        prompt = f"""Ты — эксперт по созданию детальных ментальных карт для студентов.

Твоя задача: превратить учебный текст в структурированную ментальную карту, по которой можно восстановить 80% содержания текста без перечитывания.

ТЕКСТ:
{snippet}

Правила создания карты:

1. **Узлы должны быть информативными** (8-20 слов):
   - ПЛОХО: "Митохондрия"
   - ХОРОШО: "Митохондрия → производит АТФ через окислительное фосфорилирование"
   - ХОРОШО: "Плюсы метода: высокая точность, низкая стоимость"

2. **Разбивай сложные факты на несколько узлов**:
   - Отдельно — сущность/метод/понятие
   - Отдельно — его свойства/плюсы/минусы
   - Отдельно — примеры

3. **Детализация**: от 15 до 40 узлов (в зависимости от длины текста)

4. **Для каждого важного утверждения создавай отдельный узел**:
   - "Метод X применяется в случаях Y"
   - "Ограничение метода Z — это W"
   - "Принцип работы: сначала A, потом B, затем C"

5. **Структура**: 
   - Первый узел (parent_index: null) — общая тема
   - Второй уровень — основные разделы (главы, крупные блоки)
   - Третий уровень — конкретные факты, определения, примеры
   - Четвёртый уровень — детали, нюансы, пояснения

6. **Пример хорошего узла**: 
   "Метод главных компонент (PCA): уменьшает размерность, сохраняя 95% дисперсии"

7. **Пример плохого узла**: 
   "PCA"

ФОРМАТ ОТВЕТА — ТОЛЬКО JSON:

{{
  "map_title": "Краткое название (до 12 слов)",
  "nodes": [
    {{
      "title": "Метрология: наука об измерениях, обеспечивающая единство и точность",
      "description": "Метрология задаёт правила измерений и делает результаты сопоставимыми в науке и промышленности.",
      "parent_index": null
    }},
    {{
      "title": "Основная цель → обеспечение единства измерений через эталоны",
      "description": "Единство измерений достигается через систему эталонов и процедур передачи точности.",
      "parent_index": 1
    }},
    {{
      "title": "Первичный эталон: высшая точность, национальный стандарт",
      "description": "Первичный эталон является исходной точкой калибровки и хранит максимально достижимую точность.",
      "parent_index": 2
    }}
  ]
}}

ВАЖНО: Каждый узел должен быть осмысленным сам по себе. Если вырвать узел из карты, читатель должен понимать, о чём идёт речь.
ОБЯЗАТЕЛЬНО: у каждого узла должно быть поле "description" длиной 1-2 предложения. Описание объясняет суть факта и его роль в теме.
Если описание не получается сделать идеально, всё равно верни краткое осмысленное описание.

Верни только JSON, никаких пояснений перед или после."""


        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.45,
                max_tokens=8000,
            )
            response_text = response.choices[0].message.content.strip()
            response_text = re.sub(r"```json\n?", "", response_text)
            response_text = re.sub(r"```\n?", "", response_text)
            response_text = response_text.strip()

            data = json.loads(response_text)
            if not isinstance(data, dict):
                raise ValueError("Invalid response format")
            if "nodes" not in data or not isinstance(data["nodes"], list):
                raise ValueError("No nodes in AI response")
            title = data.get("map_title") or map_title or "Карта знаний"
            title = str(title)[:200]
            raw_nodes = data["nodes"]
            cleaned: list[dict[str, Any]] = []
            for item in raw_nodes:
                if not isinstance(item, dict):
                    continue
                t = str(item.get("title", "")).strip()[:200]
                if not t:
                    continue
                d = str(item.get("description", "")).strip()[:4000] or None
                pi = item.get("parent_index")
                if pi is None or pi == "null":
                    cleaned.append({"title": t, "description": d, "parent_index": None})
                else:
                    try:
                        p = int(pi)
                        cleaned.append({"title": t, "description": d, "parent_index": p})
                    except (TypeError, ValueError):
                        continue
            if len(cleaned) < 1:
                raise ValueError("AI did not return valid nodes")
            return {"map_title": title, "nodes": cleaned}
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"AI generation failed: {str(e)}")


ai_agent_service = AIAgentService()