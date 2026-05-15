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
# Backend (JUnit 5 + Mockito + MockMvc + Testcontainers)
cd sleep-backend
./mvnw test
# → 102 unit/slice теста + integration-suite (AuthIntegrationTest)
#   Integration-тесты поднимают реальный PostgreSQL через Testcontainers и автоматически
#   пропускаются, если Docker недоступен (см. @EnabledIf isDockerAvailable).

# AI-сервис
cd sleep-ai
pytest  # если настроены тесты
```

### Smoke-тесты API (Postman)

В `docs/SleepAI-Smoke-Tests.postman_collection.json` лежит готовый набор end-to-end
запросов, проходящих весь golden path: регистрация → логин → запись сна → стресс →
AI-предсказание → чат → аналитика → GDPR-удаление → logout. Импортируется в Postman /
Insomnia / Newman; запускается через Collection Runner. Каждый шаг содержит assert на
HTTP-статус, токены и состояние данных после удаления.

```bash
# через Newman (CLI) на запущенном бэкенде:
newman run docs/SleepAI-Smoke-Tests.postman_collection.json \
  --env-var baseUrl=http://localhost:8080
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

## Ограничения и план развития

Проект разработан в рамках дипломной работы и сознательно ограничен по объёму. Ниже —
честный перечень текущих компромиссов и направлений для дальнейшего развития.

### Известные ограничения

| Область | Текущее состояние | Почему так | Что нужно для prod |
|---|---|---|---|
| **HRV / биометрия** | HRV-значения эмулируются на клиенте ([`use-stress-monitor.ts:117`](sleep-mobile/hooks/use-stress-monitor.ts#L117) — `Simulate HRV measurement`). Реальные данные с датчиков не считываются. | Интеграция с Apple HealthKit / Android Health Connect требует подписанных native-модулей и dev-аккаунтов в App Store / Play Console — это вне рамок диплома. | Подключить `react-native-health` и `react-native-health-connect`, заменить `measureHrv()` на чтение последнего R-R интервала. |
| **Heart rate fallback** | При запросе AI-предсказания всегда отправляется `heartRate: 65 bpm` ([`constants/sleep.ts`](sleep-mobile/constants/sleep.ts), `DEFAULT_HEART_RATE_BPM`). | Реального источника пульса нет (см. выше); 65 — центроид training-data в зоне здорового взрослого. | После HealthKit/Health Connect — заменить на live-чтение. |
| **Rate limiter** | In-memory (`ConcurrentHashMap` в [`LoginRateLimitFilter.java`](sleep-backend/src/main/java/kz/sleepai/backend/config/LoginRateLimitFilter.java)). Состояние сбрасывается при рестарте, не шарится между инстансами. | Внешний Redis ради 5 req/min — overkill для одиночного инстанса диплома. | Перенести счётчики в Redis при горизонтальном масштабировании. |
| **Миграции БД** | Используется `spring.jpa.hibernate.ddl-auto=update`. Схема меняется автоматически по сущностям. | Flyway / Liquibase усложнили бы первый запуск без выигрыша на одной БД. | Перед публичным релизом — заморозить текущую схему как `V1__init.sql`, переключить ddl-auto на `validate`. |
| **AI-сервис** | Запускается отдельным процессом; деградирует мягко (бэкенд возвращает 502/503), но без отдельного circuit breaker. | Resilience4j добавил бы зависимость ради одного интеграционного хука. | Обернуть `AiPredictionService` в Resilience4j с CircuitBreaker + Retry + Timeout. |
| **Light mode** | Компоненты содержат `isDark ? Brand.* : '#hex'` фолбэки, но app по факту dark-only. | Light-палитра не утверждена дизайном; токены частично совпадают со старыми хардкодами. | Утвердить light-палитру (или удалить фолбэки и зафиксировать dark-only). |
| **i18n полнота** | RU / EN / KZ покрыты для всех UI-строк. Контекст запросов к LLM локализован ([`chat.tsx`](sleep-mobile/app/(tabs)/chat.tsx) — `contextSleep/contextStress`). Системные ошибки backend всё ещё на английском (`"User not found"` и т.д.). | Backend и i18n-bundle мобилки никогда не пересекаются на этапе текста ошибок. | Перевести коды ошибок (`ERR_USER_NOT_FOUND`) — клиент сам подберёт строку из бандла. |
| **OAuth-провайдеры** | Только Google. | Apple Sign-In требует платный Apple Developer + переподпись бандла. | Добавить Apple Sign-In перед публикацией в App Store (требование Apple, если есть любой OAuth). |
| **Тесты UI** | Только TypeScript-проверка типов; нет Detox / Maestro для E2E. | Setup E2E с эмуляторами в CI — отдельный двухдневный пайплайн. | Maestro flow на golden path для регресс-тестов перед релизами. |

### Roadmap (приоритеты v1.1+)

1. **Реальная биометрия** — HealthKit / Health Connect, замена эмуляции HRV и hardcoded `heartRate`.
2. **Push-уведомления о сне** — Firebase Cloud Messaging для backend-side reminders (сейчас только локальные через `expo-notifications`).
3. **Sleep stages timeline** — переход от категориальной модели (REM/Deep/Awakenings) к таймлайну фаз по часам ночи (нужна модель на временных рядах).
4. **Семейные/командные аккаунты** — sharing-mode для пар и коучей. Требует RBAC на бэкенде.
5. **Wearables** — Mi Band / Garmin / Fitbit через Health Connect bridge.
6. **CI/CD до прод** — текущий GitHub Actions гоняет тесты; не хватает автоматического build + push в App Store / Play Store / DigitalOcean.
7. **Observability** — Prometheus метрики `/actuator/prometheus`, дашборд по latency AI-сервиса и rate-limit hit rate.
8. **Flyway-миграции** — заморозка схемы и контроль изменений через PR.
