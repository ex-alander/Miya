# ============================================================
# Multi-stage production Dockerfile для React (Vite) frontend
# Этап 1: сборка статики
# Этап 2: раздача через nginx (минимальный образ)
# ============================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Кэшируем установку зависимостей отдельным слоем
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Сборка для production (VITE_API_BASE_URL задаётся при сборке или в runtime через env)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine AS runtime

# Удаляем дефолтную конфигурацию и подставляем свою
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

# Конфиг nginx: SPA fallback, gzip, безопасные заголовки
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Права: nginx в Alpine обычно работает от nginx (non-root в новых образах)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
