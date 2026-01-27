```markdown
# Miya Learning Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-green)](https://fastapi.tiangolo.com)

**Геймифицированная система интервального повторения с ИИ-помощником "Moto"**

> Спокойное, сфокусированное место для обучения. Всё, что вам нужно, организовано внутри ваших колод карточек.

---

## 🚀 Быстрый старт за 30 секунд

```bash
# 1. Клонировать репозиторий
git clone https://github.com/ваш-username/miya-learning-companion.git
cd miya-learning-companion

# 2. Запустить бэкенд
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 3. Запустить фронтенд (в новом терминале)
cd ../frontend
npm install
npm run dev
```

**Доступ к приложению:**
- 🚀 Фронтенд: [http://localhost:5173](http://localhost:5173)
- 📚 API документация: [http://localhost:8000/docs](http://localhost:8000/docs)
- 📊 Альтернативная документация: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## ✨ Ключевые возможности

### 🧠 **Интеллектуальное обучение**
- **Алгоритм SuperMemo SM2** — научно обоснованное интервальное повторение
- **Автоматическое планирование** карточек на основе качества запоминания
- **Адаптивная сложность** — алгоритм автоматически настраивается под вашу память

### 🤖 **ИИ-помощник "Moto"**
- **Мгновенная генерация колод** из любого текста (статьи, книги, заметки)
- **Интеллектуальное выделение** ключевых концепций
- **Автоматическое формирование** вопросов и ответов (использует Groq Llama 3.3)
- **20-25 карточек за раз** — оптимальный размер для эффективного обучения

### 🎮 **Геймификация обучения**
- **XP система** — зарабатывайте опыт за успешные повторения
- **Внутренняя валюта** — монеты для покупки улучшений в магазине
- **Достижения** — разблокируйте награды за регулярность
- **Дневные стрики** — поддерживайте привычку учиться каждый день
- **Уровни сложности** — разные мультипликаторы XP для легких/сложных карточек

### 🛒 **Экономика и кастомизация**
- **Встроенный магазин** с бустами и косметическими предметами
- **Инвентарь пользователя** — коллекционируйте купленные предметы
- **Бусты обучения** — временные улучшения для эффективности

### 📊 **Аналитика прогресса**
- **Детальная статистика** по каждой колоде
- **Визуализация интервалов** повторения
- **Мониторинг прогресса** запоминания
- **Рекомендации** по улучшению результатов

---

## 🏗 Архитектура проекта

### 📁 **Структура проекта**
```
miya-learning-companion/
├── backend/                    # FastAPI бэкенд
│   ├── app/
│   │   ├── api/               # REST API эндпоинты
│   │   │   ├── routes/        # Роутеры по модулям
│   │   │   │   ├── auth.py    # Аутентификация
│   │   │   │   ├── ai.py      # ИИ-генерация колод
│   │   │   │   ├── cards.py   # Карточки CRUD
│   │   │   │   ├── decks.py   # Колоды CRUD
│   │   │   │   ├── study.py   # Изучение карточек
│   │   │   │   ├── shop.py    # Магазин
│   │   │   │   └── achievements.py # Достижения
│   │   │   └── router.py      # Главный роутер API
│   │   ├── core/              # Ядро приложения
│   │   │   ├── config.py      # Конфигурация
│   │   │   ├── security.py    # JWT аутентификация
│   │   │   └── deps.py        # FastAPI зависимости
│   │   ├── crud/              # Паттерн CRUD
│   │   │   ├── user.py        # Пользователи
│   │   │   ├── deck.py        # Колоды
│   │   │   ├── card.py        # Карточки
│   │   │   ├── shop.py        # Магазин
│   │   │   └── achievement.py # Достижения
│   │   ├── db/                # Работа с базой данных
│   │   │   ├── session.py     # Сессии SQLAlchemy
│   │   │   ├── base.py        # Базовые модели
│   │   │   ├── seed_shop.py   # Наполнение магазина
│   │   │   └── seed_achievements.py # Наполнение достижений
│   │   ├── models/            # SQLAlchemy модели
│   │   │   ├── user.py        # Модель пользователя
│   │   │   ├── deck.py        # Модель колоды
│   │   │   ├── card.py        # Модель карточки
│   │   │   ├── shop_item.py   # Товары магазина
│   │   │   └── achievement.py # Модель достижения
│   │   ├── schemas/           # Pydantic схемы
│   │   │   ├── user.py        # Схемы пользователя
│   │   │   ├── deck.py        # Схемы колоды
│   │   │   ├── card.py        # Схемы карточки
│   │   │   ├── study.py       # Схемы изучения
│   │   │   └── token.py       # JWT токены
│   │   ├── services/          # Бизнес-логика
│   │   │   ├── sm2.py         # Алгоритм SuperMemo SM2
│   │   │   ├── ai_agent.py    # Сервис ИИ-генерации
│   │   │   ├── economy.py     # Экономика (XP, монеты)
│   │   │   └── boosts.py      # Система бустов
│   │   ├── main.py            # Точка входа FastAPI
│   │   └── __init__.py
│   ├── alembic/               # Миграции базы данных
│   │   ├── versions/          # Файлы миграций (7 миграций)
│   │   └── env.py
│   ├── requirements.txt       # Python зависимости
│   ├── alembic.ini           # Конфигурация Alembic
│   ├── .env                  # Переменные окружения
│   └── app.db                # SQLite база данных
│
├── frontend/                  # React фронтенд
│   ├── src/
│   │   ├── components/        # React компоненты
│   │   │   ├── auth/          # Компоненты аутентификации
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── cards/         # Компоненты карточек
│   │   │   │   ├── CardFlip.tsx # 3D переворот карточки
│   │   │   │   ├── CardForm.tsx # Форма создания
│   │   │   │   └── CardList.tsx # Список карточек
│   │   │   ├── decks/         # Компоненты колод
│   │   │   │   ├── DeckForm.tsx
│   │   │   │   └── DeckList.tsx
│   │   │   ├── study/         # Компоненты изучения
│   │   │   │   ├── CardReview.tsx # Просмотр карточки
│   │   │   │   ├── SessionSummary.tsx # Итог сессии
│   │   │   │   └── StudyProgress.tsx # Прогресс изучения
│   │   │   └── ui/            # UI компоненты
│   │   │       ├── Button.tsx    # Кнопки
│   │   │       ├── Badge.tsx     # Бейджи
│   │   │       ├── Modal.tsx     # Модальные окна
│   │   │       ├── RichTextEditor.tsx # Редактор текста
│   │   │       └── ToastProvider.tsx # Уведомления
│   │   ├── contexts/          # React контексты
│   │   │   └── AuthContext.tsx # Контекст аутентификации
│   │   ├── hooks/             # Кастомные хуки
│   │   │   └── useApi.ts      # Хук для API запросов
│   │   ├── pages/             # Страницы приложения
│   │   │   ├── App.tsx        # Главный компонент
│   │   │   ├── LoginPage.tsx  # Страница входа
│   │   │   ├── DecksPage.tsx  # Страница колод
│   │   │   ├── StudyPage.tsx  # Страница изучения
│   │   │   ├── AIAgentPage.tsx # ИИ-помощник "Moto"
│   │   │   ├── ShopPage.tsx   # Магазин
│   │   │   ├── AchievementsPage.tsx # Достижения
│   │   │   ├── ProfilePage.tsx # Профиль
│   │   │   └── InventoryPage.tsx # Инвентарь
│   │   ├── services/          # API сервисы
│   │   │   ├── api.ts         # Базовый клиент API
│   │   │   ├── auth.ts        # Аутентификация
│   │   │   ├── deck.ts        # Колоды
│   │   │   ├── card.ts        # Карточки
│   │   │   ├── study.ts       # Изучение
│   │   │   ├── ai.ts          # ИИ
│   │   │   ├── shop.ts        # Магазин
│   │   │   └── achievements.ts # Достижения
│   │   ├── utils/             # Утилиты
│   │   │   ├── storage.ts     # Работа с localStorage
│   │   │   ├── validation.ts  # Валидация
│   │   │   └── html.ts        # HTML утилиты
│   │   ├── main.tsx           # Точка входа React
│   │   └── index.css          # Глобальные стили
│   ├── package.json           # Node.js зависимости
│   ├── vite.config.ts         # Конфигурация Vite
│   └── index.html             # HTML шаблон
│
└── README.md                  # Этот файл
```

### 🔧 **Технологический стек**

| Слой | Технологии | Назначение |
|------|------------|------------|
| **Бэкенд** | FastAPI, SQLAlchemy, Pydantic, Alembic | REST API, ORM, валидация, миграции |
| **Фронтенд** | React 18, TypeScript, Vite | UI/UX, типизация, сборка |
| **База данных** | SQLite (разработка), готово к PostgreSQL | Хранение данных |
| **Аутентификация** | JWT (python-jose), bcrypt | Безопасная аутентификация |
| **ИИ** | Groq API (Llama 3.3 70B) | Генерация контента |
| **Алгоритм** | SuperMemo SM2 | Интервальное повторение |
| **Стилизация** | CSS Modules | Компонентные стили |
| **Маршрутизация** | React Router v6 | Навигация в SPA |

---

## ⚙️ Установка и настройка

### **1. Бэкенд (FastAPI)**

```bash
# Перейти в директорию бэкенда
cd backend

# Создать виртуальное окружение (опционально)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или venv\Scripts\activate  # Windows

# Установить зависимости
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env файл, добавить:
# SECRET_KEY=ваш-секретный-ключ
# GEMINI_API_KEY=ваш-groq-api-ключ  # Получить на groq.com

# Применить миграции базы данных
alembic upgrade head

# Запустить сервер разработки
uvicorn app.main:app --reload --port 8000
```

### **2. Фронтенд (React)**

```bash
# Перейти в директорию фронтенда
cd frontend

# Установить зависимости
npm install

# Запустить сервер разработки
npm run dev
```

### **3. Проверка работоспособности**

1. **Бэкенд:** [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok"}`
2. **Фронтенд:** [http://localhost:5173](http://localhost:5173) → Интерфейс Miya
3. **API документация:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API документация

### **Основные эндпоинты**

#### 🔐 Аутентификация
```http
POST   /api/auth/login          # Вход в систему
POST   /api/auth/register       # Регистрация
POST   /api/auth/refresh        # Обновление токена
GET    /api/auth/me             # Информация о текущем пользователе
```

#### 📚 Колоды и карточки
```http
GET    /api/decks               # Список колод пользователя
POST   /api/decks               # Создание колоды
GET    /api/decks/{id}          # Детали колоды с карточками
PUT    /api/decks/{id}          # Обновление колоды
DELETE /api/decks/{id}          # Удаление колоды

GET    /api/cards               # Карточки (с фильтрацией)
POST   /api/cards               # Создание карточки
PUT    /api/cards/{id}          # Обновление карточки
DELETE /api/cards/{id}          # Удаление карточки
```

#### 🧠 Изучение
```http
GET    /api/study/due/{deck_id}  # Карточки для повторения
POST   /api/study/review/{id}    # Отправить результат повторения
GET    /api/study/stats/{deck_id} # Статистика изучения
```

#### 🤖 ИИ-помощник "Moto"
```http
POST   /api/ai/generate-deck     # Сгенерировать колоду из текста
```

#### 🛒 Магазин и экономика
```http
GET    /api/shop/items           # Список товаров в магазине
POST   /api/shop/purchase/{id}   # Покупка товара
GET    /api/shop/inventory       # Инвентарь пользователя
```

#### 🏆 Достижения
```http
GET    /api/achievements         # Все достижения
GET    /api/achievements/progress # Прогресс пользователя
```

### **Пример запроса**
```bash
# Вход в систему
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@miya.com","password":"demo123"}'
```

---

## 🧮 Алгоритм SuperMemo SM2

### **Как работает**

Miya использует **алгоритм SuperMemo SM2** — научно доказанный метод для оптимального запоминания. Алгоритм автоматически рассчитывает, когда нужно повторить каждую карточку.

### **Формула интервала**
```
intervalₙ = intervalₙ₋₁ × ease_factor × quality_multiplier
```

### **Качество запоминания (0-5)**
| Рейтинг | Значение | Описание |
|---------|----------|----------|
| **0** | Complete blackout | Совсем забыл |
| **1** | Incorrect response | Вспомнил с трудом |
| **2** | Incorrect but seemed easy | Почти вспомнил |
| **3** | Correct with difficulty | Правильно, но с затруднением |
| **4** | Correct after hesitation | Правильно после паузы |
| **5** | Perfect response | Идеально вспомнил |

### **Модификатор сложности (ease_factor)**
- **Начинается с 2.5**
- **Увеличивается**, если карточка кажется легкой
- **Уменьшается**, если карточка сложная
- **Минимум: 1.3** (очень сложные карточки)

### **Пример потока обучения**
```
День 1: Карточка создана → показ через 1 день
День 2: Ответ "Good" (4) → следующий показ через 6 дней
День 8: Ответ "Easy" (5) → следующий показ через 15 дней (6 × 2.5)
День 23: Ответ "Again" (0) → сброс, показ через 1 день
```

---

## 🤖 ИИ-помощник "Moto"

### **Генерация колод из текста**

**Moto** использует Groq API с моделью **Llama 3.3 70B** для анализа текста и создания структурированных колод карточек.

### **Как это работает:**
1. **Пользователь вводит** текст (статья, глава книги, заметки)
2. **ИИ анализирует** текст, выделяя ключевые концепции
3. **Формируются** 20-25 вопросов и ответов
4. **Создается JSON структура** с колодой и карточками
5. **Пользователь может сохранить** готовую колоду одним кликом

### **Пример запроса к ИИ:**
```json
{
  "text": "Митоз - это процесс деления клетки...",
  "deck_title": "Биология: Митоз"
}
```

### **Ответ ИИ:**
```json
{
  "title": "Биология: Митоз и его фазы",
  "description": "Карточки по процессу клеточного деления",
  "cards": [
    {
      "front_content": "Что такое митоз?",
      "back_content": "Процесс деления клетки, при котором образуются две генетически идентичные дочерние клетки."
    },
    {
      "front_content": "Назовите фазы митоза",
      "back_content": "Профаза, метафаза, анафаза, телофаза."
    }
    // ... 20-25 карточек
  ]
}
```

---

## 💰 Экономическая система

### **XP (Опыт)**
```python
# Формула расчета XP за карточку
xp = BASE_XP × quality_multiplier × difficulty_multiplier × (1 + streak_bonus) × ease_adjustment

# Мультипликаторы:
- Качество: 0-5 → 0-120% (5 = 120%)
- Сложность: easy(0.8x), normal(1x), hard(1.5x)
- Стрик: +10% за день (макс. +50%)
- Ease factor: сложные карточки (низкий EF) дают больше XP
```

### **Монеты**
- **1 монета** за успешное повторение (качество ≥ 3)
- **Бонусы за стрик:** 3 дня(+5), 7 дней(+10), 14 дней(+25), 30 дней(+50)
- **Тратить** в магазине на бусты и косметику

### **Дневные стрики**
- **+1 день** если учился вчера
- **Сброс на 1** если пропустил день
- **Поддержание** если учился сегодня

---

## 🏆 Система достижений

### **Типы достижений:**
1. **Прогресс обучения**
   - "Новичок" — создать первую колоду
   - "Стрикер" — 7 дней подряд
   - "Мастер повторений" — 100 карточек изучено

2. **Экономические**
   - "Богач" — накопить 1000 монет
   - "Покупатель" — купить первый предмет

3. **ИИ-достижения**
   - "ИИ-энтузиаст" — сгенерировать 5 колод через Moto

---

## 🛒 Магазин и инвентарь

### **Типы товаров:**
| Тип | Пример | Эффект |
|-----|--------|--------|
| **Бусты XP** | "Энергетик обучения" | +50% XP на 1 час |
| **Бусты монет** | "Золотая лихорадка" | +100% монет на 30 мин |
| **Косметика** | "Темная тема" | Изменение интерфейса |
| **Аватары** | "Ученый совенок" | Персонализация профиля |

### **API магазина:**
```http
GET    /api/shop/items          # Все товары
POST   /api/shop/purchase/{id}  # Купить товар
GET    /api/shop/inventory      # Мой инвентарь
```

---

## 🔧 Разработка

### **База данных и миграции**
```bash
# Создать новую миграцию
alembic revision --autogenerate -m "Описание изменений"

# Применить миграции
alembic upgrade head

# Откатить миграцию
alembic downgrade -1

# Наполнить базу начальными данными
python -m app.db.seed_shop
python -m app.db.seed_achievements
```

### **Структура базы данных**
```sql
-- Основные таблицы:
users              # Пользователи (id, email, username, xp, coins, streak)
decks              # Колоды (id, title, description, user_id)
cards              # Карточки (id, front, back, ease_factor, interval, next_review)
shop_items         # Товары магазина
user_inventory     # Инвентарь пользователей
achievements       # Достижения
user_achievements  # Связь пользователей и достижений
```

### **Настройка для разработки**
```bash
# 1. Включить режим отладки
export DEBUG=true

# 2. Использовать тестовую БД
export DATABASE_URL=sqlite:///./test.db

# 3. Отключить CORS ограничения (для разработки)
# В main.py уже настроено для localhost:5173
```

---

## 🐛 Устранение неполадок

### **Проблема: API не отвечает**
```bash
# Проверить работает ли бэкенд
curl http://localhost:8000/health

# Проверить логи бэкенда
# Запустить с подробным логированием
uvicorn app.main:app --reload --log-level debug
```

### **Проблема: Миграции не применяются**
```bash
# 1. Удалить базу данных
rm app.db

# 2. Пересоздать все миграции
alembic upgrade head

# 3. Или создать новую чистую БД
alembic stamp head
```

### **Проблема: ИИ не генерирует колоды**
1. **Проверить API ключ** в `.env` файле
2. **Проверить баланс** на [groq.com](https://groq.com)
3. **Тестировать API ключ:**
```python
from openai import OpenAI
client = OpenAI(api_key="ваш-ключ", base_url="https://api.groq.com/openai/v1")
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[{"role": "user", "content": "Hello"}]
)
```

### **Проблема: CORS ошибки**
```python
# В main.py добавить фронтенд домен:
allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "ваш-домен.com"]
```

---

## 📈 Мониторинг и логирование

### **Эндпоинты здоровья:**
- `GET /health` — Общее состояние
- `GET /health/db` — Состояние базы данных
- `GET /health/ai` — Доступность ИИ

### **Структурированные логи:**
```python
# В любом сервисе:
logger.info("Card reviewed", extra={
    "card_id": card.id,
    "user_id": user.id,
    "quality": quality,
    "xp_earned": xp,
    "coins_earned": coins,
    "new_streak": new_streak
})
```

### **Метрики Prometheus (потенциально):**
```python
@app.get("/metrics")
def metrics():
    return {
        "active_users": get_active_users(),
        "cards_reviewed_today": get_daily_reviews(),
        "ai_requests_today": get_ai_requests(),
        "average_review_quality": get_avg_quality(),
    }
```

---

## 🚀 Развертывание в продакшен

### **Вариант 1: Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/miya
      - SECRET_KEY=${SECRET_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    ports:
      - "8000:8000"
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
```

### **Вариант 2: Ручное развертывание**
```bash
# 1. Настройка Nginx для фронтенда
server {
    listen 80;
    server_name miya-app.com;
    root /var/www/miya/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}

# 2. Настройка systemd для бэкенда
[Unit]
Description=Miya Backend
After=network.target

[Service]
User=miya
WorkingDirectory=/opt/miya/backend
Environment=DATABASE_URL=postgresql://...
ExecStart=/opt/miya/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### **Вариант 3: Бессерверный (Vercel + Railway)**
```bash
# Фронтенд на Vercel
vercel --prod

# Бэкенд на Railway
railway up
```

---

## 🔮 Планы развития

### **В разработке:**
- [ ] Система тегов для карточек
- [ ] Совместные колоды
- [ ] Экспорт/импорт в Anki формат
- [ ] Мобильное приложение (React Native)

### **Запланировано:**
- [ ] Интеграция с YouTube (транскрипция → карточки)
- [ ] Расширенная аналитика (графики прогресса)
- [ ] Push-уведомления для повторений
- [ ] Офлайн-режим

---

## 👥 Вклад в проект

### **Структура коммитов (Conventional Commits):**
```
feat:     Новая функциональность
fix:      Исправление бага
docs:     Изменения в документации
style:    Форматирование кода
refactor: Рефакторинг без изменения функционала
test:     Добавление тестов
chore:    Вспомогательные изменения
```

### **Процесс разработки:**
1. **Форкните** репозиторий
2. **Создайте ветку:** `git checkout -b feat/новая-фича`
3. **Сделайте коммиты:** `git commit -m "feat: добавил ..."`
4. **Запушьте:** `git push origin feat/новая-фича`
5. **Создайте Pull Request**

### **Требования к коду:**
- **Бэкенд:** Следуйте PEP 8, используйте type hints
- **Фронтенд:** Строгая типизация TypeScript, ESLint
- **Тесты:** Покрытие критической функциональности
- **Документация:** Обновлять README и docstrings

---

## 📄 Лицензия

Этот проект лицензирован под **MIT License** - смотрите файл [LICENSE](LICENSE) для деталей.

## 📧 Контакты

**Автор:** Александр Чухлов
**Поддержка:** [issues](https://github.com/ex-alander/miya/issues)  
**Email:** dyrtand@gmail.com


**⭐ Если проект вам понравился, поставьте звезду на GitHub!**
