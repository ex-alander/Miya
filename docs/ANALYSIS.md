# Архитектурный аудит: учебные документы, ИИ и ментальные карты

Дата: 2026-05-12. Область: `backend/app`, `frontend/src`, с фокусом на цепочку «документ → текст → API → LLM → карта → UI».

## 1. Обзор структуры

### Backend (`backend/app`)

| Слой | Файлы | Роль |
|------|--------|------|
| API | `api/router.py` — префикс `/api`; `api/routes/mental_map.py`, `ai.py` | HTTP-эндпоинты |
| Сервисы | `services/ai_agent.py`, `mental_map_layout.py` | Вызов LLM, расчёт координат узлов |
| CRUD | `crud/mental_map.py` | БД: карты и узлы |
| Модели | `models/mental_map.py` | `MentalMap`, `MentalMapNode` |
| Схемы | `schemas/mental_map.py` | Pydantic: запрос `generate-from-text` — поле `text` |

Точка входа FastAPI: `main.py` монтирует `api_router` на **`/api`**. Health-check лежит вне API: `/health`, `/ready`.

### Frontend (`frontend/src`)

| Область | Файлы |
|---------|--------|
| Маршрут battlefield | `pages/BattlefieldPage.tsx`, `pages/App.tsx` |
| Импорт/ИИ для карты | `components/battlefield/AIGenerationModal.tsx`, `NewMapChoiceModal.tsx` |
| Извлечение текста | `utils/extractDocumentText.ts` (pdfjs, mammoth) |
| API клиент | `services/mentalMap.ts`, `services/api.ts` |

## 2. Извлечение текста из PDF/DOCX (фактическое поведение)

**Выполняется только в браузере**, не на бэкенде.

- **PDF:** `pdfjs-dist` — постранично `getTextContent()`, конкатенация строк.
- **DOCX:** `mammoth.extractRawText`.
- **TXT / MD:** `file.text()`.
- **Усечение:** если длина > 5_000_000 символов, берётся префикс ~48_000 символов (`TRUNCATE_TO`), пользователь видит предупреждение.

Итог: сервер всегда получает уже **плоский plaintext** в JSON `POST /api/mental-maps/generate-from-text`. Нет серверного парсинга PDF/DOCX, нет файловых upload-эндпоинтов для этой фичи.

## 3. Маршрутизация API

1. Axios `baseURL` = `{VITE_API_BASE_URL}/api` (см. `frontend/src/services/api.ts`).
2. Генерация карты: `mentalMapService.generateFromText` → `POST /mental-maps/generate-from-text` → полный путь **`/api/mental-maps/generate-from-text`** (требуется JWT).
3. Обработчик: `api/routes/mental_map.py` → `generate_map_from_text` вызывает `ai_agent_service.generate_mental_map_from_text`, затем валидирует `parent_index`, считает позиции `compute_node_positions`, пишет строки в БД.

Отдельный демо-ИИ для колод: `api/routes/ai.py` → `generate_deck_from_text` — тот же `AIAgentService`, другой промпт.

## 4. `AIAgentService` (`services/ai_agent.py`)

- Клиент: **OpenAI-совместимый SDK** (`openai.OpenAI`) с `base_url` из `settings.OPENAI_COMPAT_BASE_URL` и ключом `PROXY_API_KEY` или `GROQ_API_KEY`.
- **Генерация колоды:** по-прежнему один запрос с полным текстом в промпте.
- **Генерация ментальной карты:** перед вызовом LLM подключается **`rag_pipeline`**: чанкинг (`RecursiveCharacterTextSplitter`, ~1000 токенов / перекрытие ~200), in-memory **FAISS** + **BM25**, `EnsembleRetriever`; в промпт добавляются **топ-3** выдержки и блок с полным текстом (до 80k символов) для глобальной структуры.

## 5. Рендеринг ментальных карт на фронте (`BattlefieldPage`)

- Данные: `{ map, nodes }` с координатами `x`, `y` с бэкенда; связи `parent_id`.
- UI: SVG «поле боя» (`MAP_WIDTH` × `MAP_HEIGHT`), масштаб/панорамирование, прямоугольники узлов, линии родитель–ребёнок, глубина по уровню (`level` slider).
- Попап узла: заголовок + `description`.
- Новая карта с ИИ: сайдбар **+** → `NewMapChoiceModal` → «ИИ» → `AIGenerationModal` (файл → текст → `generateFromText`) → редирект на `/battlefield/:id`.

Генерация графа на клиенте не строится — только отображение и редактирование того, что вернул/сохранил backend.

## 6. Nginx и Docker Compose

- **Frontend образ** (`frontend/Dockerfile`): статика + `docker/nginx.conf`. Ранее не было `location /api/` — при сборке с относительным API through nginx запросы к бэкенду не проксировались.
- **Compose:** фронт на `:80`, бэкенд на `:8000`; переменная `VITE_API_BASE_URL` могла указывать напрямую на `:8000`, обходя nginx.

Для единой точки входа через **80** с проксированием `/api/*` на FastAPI добавлен блок в nginx и согласован префикс с axios (см. изменения в репозитории).

## 7. Узкие места для продвинутого RAG

| Узкое место | Почему мешает RAG |
|-------------|-------------------|
| Весь контекст одним куском / усечением | Длинные документы не покрываются; нет выборки «релевантных» мест под подзадачу карты. |
| Нет серверного индекса | Нельзя повторно использовать чанки без повторной нарезки и нет версии документа/коллекции. |
| Нет эмбеддингов на сервере | Невозможен semantic retrieval без внешнего API или локальных моделей. |
| Нет sparse (BM25) сигнала | Хуже совпадения по точным терминам и именам из учебника. |
| Plaintext-only API | Нормально для RAG (текст уже есть), но нет метаданных страниц/секций из PDF — только неявный порядок чанков. |
| In-memory FAISS в рамках запроса | Подходит для stateless API без хранения индекса между запросами; масштабирование на большие корпуса потребует персистентного векторного хранилища. |
| Один retrieval query для всей карты | Улучшено внедрением: гибридный ретривер по подсказке из заголовка + начала текста; дальше — multi-query, иерархический RAG, summarization слоя. |

## 8. CI/CD

- `.github/workflows/ci-cd.yml` — job **Backend Lint & Test**: шаг **RAG stack imports** (`faiss`, `rank_bm25`, импорт `rag_pipeline`), затем полный `pytest tests/` (включая `tests/test_rag_pipeline.py`).
- `.github/workflows/ci.yml` — на **pull request** отдельный job **RAG pipeline** (импорты + только `tests/test_rag_pipeline.py`) для явной регрессии RAG без ожидания остальных job-ов.

## 9. Целевое направление (гибридный поисковый движок)

Кратко по внедрённому подходу: при генерации карты текст нарезается (**RecursiveCharacterTextSplitter**, целевой размер ~1000 токенов с перекрытием ~200 через `tiktoken`), строится **in-memory FAISS** + **BM25**, объединение через **EnsembleRetriever**; в промпт явно подставляются **топ-3** чанка как «выдержки из документа», плюс обзорный фрагмент полного текста для глобальной структуры.

Метрика **F1 ≈ 0.82** на продакшен-данных требует размеченной тестовой выборки и отдельного eval-скрипта; в репозиторий добавлены **юнит-тесты стабильности RAG-пайплайна** (без сети), а не заявление о численном F1.
