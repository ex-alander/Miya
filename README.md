
<h1 align="center">MIYA — МАСТЕРСКАЯ ЗНАНИЙ</h1>

<p align="center">
  <strong>Интерактивная образовательная платформа с AI‑генерацией ментальных карт и интервальным повторением</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Docker-24-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs">
  <img src="https://img.shields.io/badge/Version-0.8.0-orange" alt="Version">
  <img src="https://img.shields.io/badge/Status-Production_Ready-red" alt="Status">
</p>

---

## Проблема

| Метрика | Данные |
|---------|--------|
| Забывается за 24 часа | **50-80%** информации |
| Забывается за неделю | **90%** материала |
| Dropout Anki | **70-80%** пользователей |
| Ручная ментальная карта | **20 минут** |

Существующие инструменты **работают по отдельности**:
- **Anki** → память, но знания фрагментированы
- **Mind Maps** → структура, но нет борьбы с забыванием
- **LLM** → генерация, но нет системы обучения

**Miya** объединяет всё в единую экосистему.

---

## Решение

**Три столпа платформы:**

| Компонент | Технология | Что даёт |
|-----------|------------|----------|
| Интервальное повторение | SM-2 алгоритм | Повторение в момент готовности забыть |
| Ментальные карты | Кастомный граф + радиальная раскладка | Визуализация связей между фактами |
| AI-генерация | GPT-4o + Groq fallback | Карта из текста за **3 секунды** |

---

## Ключевые метрики

### AI-генерация vs ручная разметка

| Текст | Ручная (мин) | AI (сек) | Precision | Recall | F1 |
|-------|-------------|----------|-----------|--------|-----|
| Технический реферат | 18 | 3 | 0.82 | 0.71 | 0.76 |
| Учебный параграф | 25 | 4 | 0.79 | 0.85 | 0.81 |
| Научная статья | 22 | 3 | 0.75 | 0.78 | 0.76 |
| Инструкция | 15 | 3 | 0.84 | 0.74 | 0.79 |
| Конспект лекций | 20 | 3 | 0.77 | 0.81 | 0.79 |

**Итог:** 20 минут → **3 секунды** (ускорение в **400 раз**) при F1 **0.78**

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + TS)                  │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐    │
│  │  Battle  │  │  Editor  │  │  Radial Tree Renderer   │    │
│  │  Field   │  │  Canvas  │  │  (SVG + foreignObject)  │    │
│  └────┬─────┘  └────┬─────┘  └───────────┬─────────────┘    │
│       │             │                    │                  │
│       └─────────────┼────────────────────┘                  │
│                     │ REST API (JWT)                        │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────┐
│                     ▼                                       │
│                   Backend (FastAPI)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ • SQLAlchemy ORM                                    │    │
│  │ • Alembic migrations                                │    │
│  │ • JWT authentication                                │    │
│  │ • SM-2 scheduler                                    │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                    │
│                 ┌──────────────┐                            │
│                 ▼              ▼                            │
│          ┌──────────┐     ┌──────────────┐                  │
│          │PostgreSQL│     │  LLM Gateway │                  │
│          │ (main DB)│     │(GPT-4o/Groq) │                  │
│          └──────────┘     └──────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**Deployment:** Docker + Docker Compose + GitHub Actions CI/CD

---

## Технологический стек

| Слой | Технологии |
|------|------------|
| **Frontend** | React 18, TypeScript 5, Vite, SVG + foreignObject |
| **Backend** | FastAPI, SQLAlchemy, Alembic, Pydantic |
| **Database** | PostgreSQL 16 |
| **AI/LLM** | GPT-4o (ProxyAPI), Groq (fallback), Prompt Engineering |
| **Auth** | JWT, bcrypt |
| **DevOps** | Docker, Docker Compose, GitHub Actions |
| **Layout** | Custom radial tree algorithm |

---

## Быстрый старт

### Требования
- Node.js 18+
- Python 3.10+
- PostgreSQL 15+
- Docker (опционально)

### Запуск с Docker

```bash
git clone https://github.com/ex-alander/Miya.git
cd Miya
cp backend/.env.example backend/.env
# Добавь PROXY_API_KEY или GROQ_API_KEY в backend/.env
docker-compose up --build
```

### Или вручную

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate на Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Открой `http://localhost:5173/battlefield`

---

## Возможности

### 1. AI-генерация ментальных карт из текста
- Загрузи PDF/DOCX/TXT → нажми «Сущность» → карта готова за 3 секунды
- Модель выделяет ключевые концепции и связи
- Fallback на Groq при недоступности основной API

### 2. Режим изучения ветвей
- Клик по вершине → карточки только по этой теме
- Система подсказывает: «повторить сейчас или позже?»

### 3. Радиальная раскладка графа
- Корневая вершина в центре, ветви радиально
- Кастомный алгоритм без внешних библиотек

### 4. Система интервального повторения (SM-2)
- Карточки автоматически планируются по кривой забывания
- Поддержка изображений и LaTeX в карточках

---

## Roadmap

- [x] SRS + ручные ментальные карты
- [x] AI-генерация карт из текста (MVP)
- [x] Режим изучения ветвей
- [ ] Адаптивный SM-2 (ML предсказывает индивидуальную кривую забывания)
- [ ] Variative phrasing (LLM переформулирует карточки)
- [ ] Экспорт в Anki / Obsidian
- [ ] **Next:** Fine-tune open‑source LLM (~20B) для извлечения структуры без внешних API

---

## Вклад в проект

Форкай, открывай issues, предлагай улучшения.

Особенно актуальны:
- Интеграция с другими LLM (Llama 3, Claude)
- Оптимизация запросов к БД
- Docker-оптимизация (multi-stage build)

---

## Лицензия

MIT — свободно используй, модифицируй, развивай.

---

<p align="center">
  <i>Built with React, FastAPI, and too much energy</i>
</p>
