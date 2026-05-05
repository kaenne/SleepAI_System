# SleepMind — AI-система мониторинга сна и стресса

Дипломный проект. Трёхкомпонентная система для анализа качества сна с использованием машинного обучения.

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  Mobile App (Expo / RN)                 │
│   iOS / Android · Offline-first · JWT auth · i18n      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS REST
                        ▼
┌─────────────────────────────────────────────────────────┐
│             Backend (Spring Boot 3.2)                   │
│   JWT dual-token · Rate limiting · Bean Validation      │
│   PostgreSQL · JPA · CORS · Swagger UI                  │
└──────────┬──────────────────────────┬───────────────────┘
           │ PostgreSQL               │ HTTP /predict
           ▼                          ▼
┌──────────────────┐      ┌───────────────────────────────┐
│   PostgreSQL 15  │      │    AI Service (FastAPI)        │
│   sleep_db       │      │  HistGradientBoosting · SHAP   │
└──────────────────┘      │  13 features · v2.1.0          │
                          └───────────────────────────────┘
```

## Стек технологий

| Компонент | Технологии |
|-----------|-----------|
| Mobile | React Native 0.74, Expo SDK 51, TypeScript, AsyncStorage |
| Backend | Java 17, Spring Boot 3.2, Spring Security, JWT (jjwt 0.11) |
| Database | PostgreSQL 15, Hibernate / JPA |
| AI Service | Python 3.11, FastAPI, scikit-learn 1.3, SHAP, pandas |
| Infra | Docker Compose, GitHub Actions (CI) |

## Ключевые возможности

- **AI-предсказание сна** — модель HistGradientBoosting предсказывает качество сна (0–100%), фазы REM / глубокого сна и категорию пробуждений
- **SHAP-объяснения** — топ-3 фактора влияния для каждого предсказания (почему такой результат)
- **Дневник сна** — офлайн-первый подход, данные синхронизируются с бэкендом при наличии сети
- **Мониторинг стресса** — на основе HRV (Heart Rate Variability)
- **JWT безопасность** — access (24 ч) + refresh (7 дней) токены, инвалидация при logout через `tokenVersion`
- **Rate limiting** — 5 попыток входа/мин/IP (скользящее окно)
- **Многоязычность** — русский, английский, казахский
- **Google OAuth** — вход через Google-аккаунт

## Быстрый старт (Docker)

### Требования
- Docker Desktop 4.x+
- 4 GB RAM свободно

### Запуск

```bash
# 1. Скопируй переменные окружения
cp .env.example .env

# 2. Заполни .env:
#    DB_PASSWORD=любой_пароль
#    JWT_SECRET=минимум_32_символа_в_base64

# 3. Запусти все три сервиса
docker compose up --build

# Сервисы будут доступны:
#   Backend API:  http://localhost:8080
#   Swagger UI:   http://localhost:8080/swagger-ui.html
#   AI Service:   http://localhost:8000
#   AI Docs:      http://localhost:8000/docs
```

### Остановка

```bash
docker compose down          # остановить
docker compose down -v       # остановить + удалить данные БД
```

## Разработка без Docker

### Backend (Spring Boot)

```bash
cd sleep-backend

# Нужен PostgreSQL 15 локально (sleep_db / postgres / <пароль>)
export JWT_SECRET=<base64-строка-32+-символа>
export DB_PASSWORD=<пароль>

./mvnw spring-boot:run
# → http://localhost:8080
```

### AI Service (FastAPI)

```bash
cd sleep-ai
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### Mobile (Expo)

```bash
cd sleep-mobile
npm install

# Создай .env с адресом бэкенда:
echo "EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8080" > .env

npx expo start
# Открой Expo Go на телефоне или запусти эмулятор
```

## API — основные эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход (rate-limited: 5/мин) |
| POST | `/api/auth/refresh` | Обновление токена |
| POST | `/api/auth/logout` | Выход (инвалидирует токен) |
| GET | `/api/journal/entries` | Записи дневника |
| POST | `/api/journal/entries` | Добавить запись |
| GET | `/api/analysis/sleep` | Анализ качества сна |
| GET | `/api/analysis/stress` | Анализ стресса |
| POST | `/api/ai/predict` | AI-предсказание (прокси к AI-сервису) |
| POST | `/api/chat/message` | Чат-ассистент по сну |
| DELETE | `/api/user/data` | Удаление всех данных (GDPR) |

Полная документация: `http://localhost:8080/swagger-ui.html`

## ML-модель

```
Модель:      HistGradientBoostingRegressor  (scikit-learn)
Версия:      v2.1.0
Входные признаки (13):
  sleep_duration, stress_level, heart_rate, physical_activity,
  caffeine, alcohol, exercise_freq, age, gender,
  bmi, daily_steps, sleep_disorder, bedtime_hour

Выходы:
  quality          — качество сна 0–100%   (R² = 0.91 на тест. выборке)
  rem_percentage   — доля REM-фазы
  deep_percentage  — доля глубокого сна
  awakenings       — категория: норма (0-2) / нарушен (3+)  [точность 64.5%]

Объяснимость:   SHAP TreeExplainer — топ-3 фактора на каждый запрос
Данные:         3600 строк (реальные датасеты + калиброванные синтетические)
```

## Тесты

```bash
# Backend (JUnit 5 + Mockito + MockMvc)
cd sleep-backend
./mvnw test
# → 102 теста, 0 ошибок

# AI-сервис
cd sleep-ai
pytest  # если настроены тесты
```

## Структура проекта

```
SleepAI_System/
├── sleep-mobile/          # React Native / Expo
│   ├── app/               # Экраны (Expo Router)
│   ├── components/        # UI-компоненты
│   ├── contexts/          # Auth, i18n контексты
│   ├── hooks/             # useSleepJournal, useBackendStatus…
│   └── services/          # API-клиент, auth
├── sleep-backend/         # Spring Boot
│   ├── src/main/java/kz/sleepai/backend/
│   │   ├── controller/    # REST-контроллеры
│   │   ├── service/       # Бизнес-логика
│   │   ├── model/         # JPA-сущности
│   │   ├── dto/           # Request / Response DTO
│   │   ├── repository/    # Spring Data JPA
│   │   └── config/        # Security, JWT, CORS, RateLimit
│   └── src/test/          # 102 теста
├── sleep-ai/              # Python FastAPI
│   ├── main.py            # API + предсказания + чат
│   ├── train_model.py     # Обучение модели
│   ├── augment_phases.py  # Генерация синтетических данных
│   └── knowledge_base.json
├── docker-compose.yml     # Запуск всей системы
└── .env.example           # Шаблон переменных окружения
```

## Переменные окружения

| Переменная | Обязательная | Описание |
|-----------|:---:|---------|
| `DB_PASSWORD` | ✅ | Пароль PostgreSQL |
| `JWT_SECRET` | ✅ | Base64-строка ≥ 32 символа для подписи JWT |
| `JWT_EXPIRATION` | — | Время жизни access-токена, мс (по умолчанию 86400000) |
| `AI_SERVICE_URL` | — | URL AI-сервиса (по умолчанию http://ai:8000 в Docker) |
| `UPLOAD_DIR` | — | Директория для загрузок (по умолчанию ./uploads) |
| `EXPO_PUBLIC_API_BASE_URL` | — | URL бэкенда для мобильного приложения |
