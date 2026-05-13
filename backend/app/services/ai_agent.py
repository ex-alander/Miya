"""
AI Agent Service using Groq (replaces Google GROQ)
Handles text-to-deck generation and other AI features
"""
import json
import logging
import re
<<<<<<< HEAD
import os
from datetime import datetime
from typing import Any, Optional
=======
from typing import Any

<<<<<<< HEAD
>>>>>>> mac_changes
=======
>>>>>>> mac_changes
from openai import OpenAI

from app.core.config import settings

<<<<<<< HEAD
<<<<<<< HEAD
# Путь к файлу датасета (можно задать через переменную окружения)
DATASET_PATH = os.environ.get("MENTAL_MAP_DATASET_PATH", "mental_map_dataset.jsonl")
=======
logger = logging.getLogger(__name__)
>>>>>>> mac_changes
=======
logger = logging.getLogger(__name__)
>>>>>>> mac_changes


class AIAgentService:
    """Service for AI-powered features using Groq."""

    def __init__(self):
<<<<<<< HEAD
<<<<<<< HEAD
        """Initialize ProxyAPI client."""
        if settings.PROXY_API_KEY: 
=======
        """Initialize OpenAI-compatible client (chat + embeddings base URL)."""
        api_key = (settings.PROXY_API_KEY or settings.GROQ_API_KEY or "").strip()
        if api_key:
>>>>>>> mac_changes
=======
        """Initialize OpenAI-compatible client (chat + embeddings base URL)."""
        api_key = (settings.PROXY_API_KEY or settings.GROQ_API_KEY or "").strip()
        if api_key:
>>>>>>> mac_changes
            self.client = OpenAI(
                base_url=settings.OPENAI_COMPAT_BASE_URL,
                api_key=api_key,
            )
            self.model = "gpt-5.4"
        else:
            self.client = None
            self.model = None

    def is_available(self) -> bool:
        """Check if AI service is available."""
<<<<<<< HEAD
<<<<<<< HEAD
        return self.client is not None and settings.PROXY_API_KEY != ""

    def _save_to_dataset(
        self,
        input_text: str,
        output_data: dict[str, Any],
        source: Optional[str] = None,
    ) -> None:
        """
        Сохраняет пример (input, output) в JSONL-файл датасета.
        Каждый вызов дописывает новую строку. Формат готов для HF.
        """
        instruction = (
            "Извлеки из текста иерархическую ментальную карту (список узлов с заголовком, "
            "описанием и parent_index)."
        )
        example = {
            "instruction": instruction,
            "input": input_text,
            "output": output_data,
            "metadata": {
                "source": source or "unknown",
                "model": self.model,
                "timestamp": datetime.now().isoformat(),
            }
        }
        # Дописываем в файл
        with open(DATASET_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(example, ensure_ascii=False) + "\n")
=======
        return self.client is not None and bool(
            (settings.PROXY_API_KEY or settings.GROQ_API_KEY or "").strip()
        )
>>>>>>> mac_changes
=======
        return self.client is not None and bool(
            (settings.PROXY_API_KEY or settings.GROQ_API_KEY or "").strip()
        )
>>>>>>> mac_changes

    def generate_deck_from_text(
        self, text: str, deck_title: str | None = None
    ) -> dict[str, Any]:
        # ... существующий код без изменений ...
        pass

    def generate_mental_map_from_text(
        self, text: str, map_title: str | None = None, source: Optional[str] = None
    ) -> dict[str, Any]:
        """Extract a hierarchical concept map (nodes + parent links) as JSON."""
        if not self.is_available():
            raise ValueError("Groq API key not configured")

        from app.services import rag_pipeline

        evidence_section = ""
        if rag_pipeline.is_rag_embedding_configured() and len(text.strip()) >= 400:
            try:
                chunks = rag_pipeline.hybrid_top_chunks(
                    text, map_title=map_title, top_k=3
                )
                if chunks:
                    blocks = []
                    for i, c in enumerate(chunks, 1):
                        blocks.append(
                            f"--- Выдержка {i} (фрагмент исходного документа) ---\n{c.strip()}"
                        )
                    joined = "\n\n".join(blocks)
                    evidence_section = f"""
РЕЛЕВАНТНЫЕ ВЫДЕРЖКИ ИЗ ДОКУМЕНТА (опирайся на формулировки и факты отсюда; не противоречь им):
{joined}

"""
            except Exception as e:
                logger.warning("RAG retrieval skipped: %s", e)

        snippet = text[:80000]
        prompt = f"""Ты — эксперт по созданию детальных ментальных карт для студентов.

Твоя задача: превратить учебный текст в структурированную ментальную карту, по которой можно восстановить 80% содержания текста без перечитывания.

{evidence_section}ПОЛНЫЙ ТЕКСТ (структура и охват; при противоречии между общим текстом и выдержками выше — приоритет у выдержек как у цитат первичного источника):
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
                max_completion_tokens=8000,
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
            result = {"map_title": title, "nodes": cleaned}
            
            # Сохраняем в датасет
            # source можно передать при вызове (например, имя файла статьи)
            self._save_to_dataset(text, result, source=source)
            
            return result
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"AI generation failed: {str(e)}")


ai_agent_service = AIAgentService()