# SleepAI — Session Handoff for Next Claude

> Last updated: end of session 2026-05-14. Read this first before doing anything substantial.

## 1. What this project is

**SleepAI** — дипломный проект (защита скоро). Трёхкомпонентная система:
- `sleep-mobile/` — React Native / Expo SDK 51, TypeScript
- `sleep-backend/` — Spring Boot 3.2, Java 17, PostgreSQL 15
- `sleep-ai/` — FastAPI + scikit-learn (HistGradientBoosting + SHAP)
- `docker-compose.yml` поднимает все три

The user is a thesis student. They are **the primary stakeholder** — defense is the priority, not long-term code health.

## 2. User context

- Speaks Russian. Default to Russian replies unless they switch.
- Prefers terse, scannable answers with concrete file paths + line numbers.
- Uses Windows + PowerShell (NOT bash via WSL — use PowerShell tool for shell ops, or use Bash tool which routes to Git-Bash). PowerShell does not have `&&` chaining — use `;` + `if ($?)`.
- Has Docker Desktop, Node.js, Maven (via `mvnw.cmd`).
- Deadline-driven. Don't propose big refactors. Don't over-engineer.
- Email: saiat.sartay@gmail.com (from auto-injected context).

## 3. What's already been done across recent sessions

### Mobile (`sleep-mobile/`)

| File | What changed |
|---|---|
| [app/_layout.tsx](../sleep-mobile/app/_layout.tsx) | Fixed auth-aware routing: waits for `useAuth().isLoading=false` + onboarding state, then routes to `/(tabs)` if authed, `/welcome` if onboarding done, else stays on `/onboarding`. `SplashScreen.hideAsync()` moved into routing effect to prevent flicker. |
| [app/(tabs)/index.tsx](../sleep-mobile/app/(tabs)/index.tsx) | Removed dead `accentColor`/`successColor`/`journalLabel` from HomeActionBar call. Enriched "Прошлая ночь" card with date + sleep + stress metric layout. |
| [components/home/home-action-bar.tsx](../sleep-mobile/components/home/home-action-bar.tsx) | Removed broken Дневник button (was routing to `/` = no-op). Removed unused props. Brand-token migration. Add-button green: `#22c55e` → `Brand.good`, text `#0a1e0a` → `Brand.textInverse`. |
| [components/home/quick-entry-form.tsx](../sleep-mobile/components/home/quick-entry-form.tsx) | Removed dead `sleepHoursText`/`stressLevelText` props from AiPredictionResult. Typed `colors: any` → `colors: ThemeTokens`. Added Alert for invalid sleep/stress input. Uses `DEFAULT_HEART_RATE_BPM` + `SLEEP_MIN_HOURS`/`SLEEP_MAX_HOURS` from `constants/sleep.ts`. Brand-token migration. |
| [components/sleep-timer.tsx](../sleep-mobile/components/sleep-timer.tsx) | `console.error` → `console.warn` (2 places). Brand-token migration. |
| [components/home/ai-info-cards.tsx](../sleep-mobile/components/home/ai-info-cards.tsx) | Brand-token migration. |
| [app/(tabs)/profile.tsx](../sleep-mobile/app/(tabs)/profile.tsx) | `goalPct` uses `computeSleepScore` (was `(h/8)*100`). `updateProfile` failure → Alert (was silent catch). **Language picker removed** (was duplicating Settings). |
| [app/(tabs)/settings.tsx](../sleep-mobile/app/(tabs)/settings.tsx) | `deleteUserData` failure surfaces error Alert (was silent). `'Гость'`/`'Войдите для синхронизации'` hardcodes → `t('settings.guest')`/`t('settings.loginPrompt')`. |
| [app/(tabs)/chat.tsx](../sleep-mobile/app/(tabs)/chat.tsx) | `userContext` (sent to LLM) localized via `chat.contextSleep/contextStress/contextHourUnit` instead of hardcoded RU. `sleepScore` uses `computeSleepScore`. |
| [app/(tabs)/stats.tsx](../sleep-mobile/app/(tabs)/stats.tsx) | `SkeletonBox` memory leak fixed via `withRepeat(withSequence(...))` instead of `setInterval + setTimeout`. `sleepQualityPercentage` + `weeklyTargetProgress` use `computeSleepScore`. |
| **NEW** [constants/sleep.ts](../sleep-mobile/constants/sleep.ts) | Shared `SLEEP_MIN_HOURS=0`, `SLEEP_MAX_HOURS=12`, `SLEEP_NORM_FROM=7`, `SLEEP_NORM_TO=9`, `DEFAULT_HEART_RATE_BPM=65`, `computeSleepScore(h)` (piecewise WHO-aligned: 0h→0, 7-9h→100, 10h→90, 12h→70, floor 40). |
| [constants/theme.ts](../sleep-mobile/constants/theme.ts) | `ThemeTokens` type now exported. |
| [locales/{ru,en,kz}.ts](../sleep-mobile/locales/) | Added: `home.invalidSleepHours` (with `{{min}}/{{max}}` params), `home.invalidStress`, `settings.clearServerFailed`, `profile.nameSyncFailed`, `chat.contextSleep/contextStress/contextHourUnit`. |
| [app/modal.tsx](../sleep-mobile/app/modal.tsx) | `SLEEP_MIN/SLEEP_MAX/NORM_FROM/NORM_TO` now imported from `constants/sleep.ts` (was inline). |

### Backend (`sleep-backend/`)

| File | What changed |
|---|---|
| [controller/UserController.java](../sleep-backend/src/main/java/kz/sleepai/backend/controller/UserController.java) | **`deleteData` (GDPR) now wipes 6 tables** (was 3): added recommendations, chat_messages, password_reset_tokens. Order: dependents → owners. **`exportData` fixed**: `journals/sessions/stress.forEach(setUser(null))` before return — Jackson can't resolve lazy `User` proxy after JPA session closes (`open-in-view=false`). This was a real bug, not introduced by us. |
| [repository/PasswordResetTokenRepository.java](../sleep-backend/src/main/java/kz/sleepai/backend/repository/PasswordResetTokenRepository.java) | Added `deleteByEmail` for GDPR. |
| [integration/AuthIntegrationTest.java](../sleep-backend/src/test/java/kz/sleepai/backend/integration/AuthIntegrationTest.java) | Added `delete_user_data_wipes_journal_and_stress`. Test seeds journal+stress → DELETE /api/user/data → verifies tables empty + account row survives. |

### Docs

| File | What changed |
|---|---|
| [README.md](../README.md) | Added **"Ограничения и план развития"** section: honest list of 9 limitations (HRV emulation, in-memory rate-limiter, ddl-auto vs Flyway, hardcoded heart-rate, light mode incomplete, etc.) + 8-point roadmap. Also added Newman section. |
| **NEW** [docs/SleepAI-Smoke-Tests.postman_collection.json](./SleepAI-Smoke-Tests.postman_collection.json) | 20 sequential requests covering full golden path. Verified end-to-end against live Docker stack — **all 25/25 assertions green**. |

## 4. Verified working (don't doubt these)

- ✅ `tsc --noEmit -p sleep-mobile/tsconfig.json` clean
- ✅ Docker compose stack starts (db + ai + backend all healthy)
- ✅ Postman smoke run: 20/20 requests, 25/25 assertions passed against running stack
- ✅ TypeScript types in profile.tsx after language removal — no orphan refs

## 5. NOT verified — needs user's hands

- `./mvnw test` in sleep-backend — never successfully run by Claude (PowerShell pathing issues). Integration tests need Docker running. User must run.
- Mobile app on actual device — user reported "QR не находит сервер". Workaround given: `npx expo start --tunnel`.
- Splash flicker fix on real device launches (cold/warm starts, with/without auth state).
- 5-min demo video for thesis appendix.

## 6. Known leftover work

### Low-risk polish
- `ai-prediction-card.tsx` still has hardcoded colors (`#A78BFA`, `#2C2C3E`, `#151522`, `#2D234A`) — Brand-token migration not done. User didn't list it; do only if asked.
- Light-mode fallbacks (`isDark ? Brand.x : '#hex'`) remain across components. App is de facto dark-only. Either complete the light palette or remove fallbacks. Documented in README Limitations.

### Mentioned by user but not done
- **Refresh token type check** — backend doesn't verify `type === 'REFRESH'` before swapping. Allows access token to be used as refresh. ~20 min fix in `AuthService` or wherever refresh handler lives. User said this is optional.
- **User.id type consistency** — user mentioned potential `Long`/`UUID`/`String` mismatch across entities. Not investigated.

## 7. Critical gotchas

- **PowerShell quirks** (this is Windows): no `&&` — use `;` + `if ($?)`. `Invoke-RestMethod` throws on non-2xx (catch with try/catch and inspect `$_.ErrorDetails.Message`). Native exe stderr redirect (`2>&1`) triggers spurious PSError lines — don't use; stderr is captured automatically.
- **Docker registry timeouts** — pulling python:3.11-slim has hit TLS handshake timeout. If `docker compose up --build` fails: try `docker compose up -d` (no rebuild) — there are cached images from prior runs.
- **`spring.jpa.open-in-view=false`** in [application.properties](../sleep-backend/src/main/resources/application.properties) — means any controller that returns JPA entities with `@ManyToOne(LAZY)` will break Jackson serialization unless you detach (`setUser(null)`) or use DTOs. This bit us in `exportData`. Watch for similar in other controllers.
- **AI service** has graceful degradation in the backend — Newman collection accepts `200|502|503` for `/api/ai/predict` and `/api/chat/message`. If those return 400, it's a body schema problem, not AI being down.
- **Email/etc localized strings**: keys are nested under domain (e.g. `settings.guest`, `chat.contextSleep`). When adding new keys, add to all three locales (ru.ts, en.ts, kz.ts) and verify type — `import type { Translations } from './ru'` enforces it.
- **HRV ≠ heart rate**. `latestStress.hrvScore` (variability, ms, 20-150) is NOT a substitute for `heartRate` (pulse, bpm, 60-100). Don't swap them — AI service validates `heartRate: Field(ge=20, le=250)` and HRV value falls in pulse range, causing model to read it as bradycardia.
- **Postman collection paths**: `/health` is unauthenticated (not `/api/health`). Chat body field is `content`, not `message`. Refresh response is flat (no `tokens` wrapper, unlike register/login).

## 8. Project anatomy quick-ref

```
SleepAI_System/
├── README.md                          ← public README + limitations + roadmap
├── docker-compose.yml                 ← db + ai + backend
├── docs/
│   ├── SESSION_HANDOFF.md             ← you are reading this
│   └── SleepAI-Smoke-Tests.postman_collection.json
├── sleep-mobile/                      ← Expo / RN
│   ├── app/(tabs)/{index,chat,stats,profile,settings}.tsx
│   ├── components/{home/,sleep-timer.tsx}
│   ├── constants/{theme.ts,sleep.ts}  ← shared constants
│   ├── contexts/{auth,i18n,theme}.tsx
│   ├── hooks/                         ← use-sleep-journal, use-stress-monitor
│   └── locales/{ru,en,kz}.ts          ← keep all three in sync
├── sleep-backend/                     ← Spring Boot
│   └── src/main/java/kz/sleepai/backend/
│       ├── controller/                ← REST endpoints
│       ├── service/
│       ├── model/                     ← JPA entities (lazy relations everywhere)
│       ├── repository/
│       ├── dto/
│       └── config/{SecurityConfig,JwtCore,LoginRateLimitFilter}.java
└── sleep-ai/                          ← FastAPI + sklearn
    └── main.py                        ← /predict, /chat
```

## 9. Quick commands for verification

```powershell
# Mobile TS check
npx tsc --noEmit -p sleep-mobile/tsconfig.json

# Spin up stack (uses cached images if available)
docker compose up -d
docker inspect --format "{{.State.Health.Status}}" sleepai-backend

# Newman smoke run (must have Node 18+)
npx -y newman run docs/SleepAI-Smoke-Tests.postman_collection.json `
  --env-var baseUrl=http://localhost:8080 `
  --env-var aiUrl=http://localhost:8000

# Backend tests (requires Docker for integration suite)
cd sleep-backend; .\mvnw.cmd test

# Backend logs when debugging
docker logs sleepai-backend --tail 60
```

## 10. Tone for the next session

User asks questions like "что насчёт X, не слетит?" — wants a **risk assessment**, not optimistic reassurance. Be honest: separate "verified working" from "looks right in the diff". When in doubt, say what's NOT verified.

If proposing fixes, give one focused recommendation, not a menu of options. User has decision fatigue close to defense.

Don't auto-commit. User commits explicitly.

Don't run destructive commands (force push, reset --hard, rm -rf containers) without confirmation.
