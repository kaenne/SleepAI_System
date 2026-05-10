from fastapi import FastAPI, HTTPException, Header, Request, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
import joblib
import numpy as np
import os
import logging
import random
import json
import pandas as pd
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
try:
    from rapidfuzz import fuzz
    _HAS_FUZZ = True
except ImportError:
    fuzz = None
    _HAS_FUZZ = False

try:
    from anthropic import Anthropic
    _HAS_ANTHROPIC = True
except ImportError:
    Anthropic = None
    _HAS_ANTHROPIC = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load knowledge base from external JSON — edit without redeployment
_kb_path = os.path.join(BASE_DIR, 'knowledge_base.json')
try:
    with open(_kb_path, encoding='utf-8') as _f:
        _kb = json.load(_f)
    TOPICS = _kb['topics']
    FOLLOW_UPS = _kb['follow_ups']
    logger.info("Knowledge base loaded: %d topics", len(TOPICS))
except Exception as _e:
    TOPICS = {}
    FOLLOW_UPS = ["Расскажите подробнее о вашей ситуации."]
    logger.error("Failed to load knowledge_base.json: %s", _e)

# Rate limiter — defends AI service from abuse / DoS
limiter = Limiter(key_func=get_remote_address)

# Shared secret for backend → AI calls. If set, /predict and /chat require X-Internal-Token.
INTERNAL_API_TOKEN = os.environ.get("INTERNAL_API_TOKEN", "").strip()
if not INTERNAL_API_TOKEN:
    logger.warning("INTERNAL_API_TOKEN not set — AI endpoints are open. Set it in production.")

# Anthropic Claude client — chat falls back to KB lookup if not configured.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-haiku-4-5-20251001").strip()
_llm_client = None
if _HAS_ANTHROPIC and ANTHROPIC_API_KEY:
    try:
        _llm_client = Anthropic(
            api_key=ANTHROPIC_API_KEY,
            default_headers={"anthropic-beta": "prompt-caching-2024-07-31"}
        )
        logger.info("LLM enabled: %s", LLM_MODEL)
    except Exception as _e:
        logger.error("Anthropic init failed: %s", _e)
else:
    logger.info("LLM disabled — using knowledge-base fallback for chat (set ANTHROPIC_API_KEY to enable)")

_LLM_SYSTEM_PROMPT = (
    "Ты — SleepMind, AI-коуч по сну и стрессу. Цель: давать чёткие, конкретные, "
    "доказательные советы по гигиене сна, борьбе с бессонницей, стрессом и тревогой.\n\n"
    "Правила:\n"
    "- Отвечай на языке пользователя (RU/EN/KZ).\n"
    "- Будь краток: 80–180 слов, маркированные пункты или короткие абзацы.\n"
    "- Опирайся на CBT-I, sleep hygiene, 4-7-8 дыхание, sleep restriction.\n"
    "- Не давай медицинских диагнозов и не назначай препараты — рекомендуй "
    "обратиться к врачу при симптомах апноэ, депрессии или хронической бессонницы >3 мес.\n"
    "- Если пользователь делится своими данными (часы сна, стресс, HRV) — упоминай их в ответе."
)

def require_internal_token(x_internal_token: Optional[str] = Header(default=None)):
    if INTERNAL_API_TOKEN and x_internal_token != INTERNAL_API_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal token")

# Инициализация приложения FastAPI
app = FastAPI(
    title="SleepAI Prediction API",
    description="Микросервис ИИ для прогнозирования качества сна",
    version="2.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Загрузка модели, scaler и порядка признаков
model_q = scaler_q = model_p = scaler_p = None

try:
    model_q  = joblib.load(os.path.join(BASE_DIR, 'model_quality.pkl'))
    scaler_q = joblib.load(os.path.join(BASE_DIR, 'scaler_quality.pkl'))
    logger.info("Quality model loaded.")
except Exception as e:
    logger.error("Failed to load quality model: %s", e)

try:
    model_p  = joblib.load(os.path.join(BASE_DIR, 'model_phases.pkl'))
    scaler_p = joblib.load(os.path.join(BASE_DIR, 'scaler_phases.pkl'))
    logger.info("Phases model loaded.")
except Exception as e:
    logger.error("Failed to load phases model: %s", e)

# SHAP explainer — инициализируем один раз при старте (не на каждый запрос)
_shap_explainer = None
try:
    import shap
    _shap_bg = joblib.load(os.path.join(BASE_DIR, 'shap_background.pkl'))
    _shap_explainer = shap.TreeExplainer(model_q, _shap_bg)
    logger.info("SHAP explainer initialized (%d background samples)", len(_shap_bg))
except Exception as _e:
    logger.warning("SHAP not available: %s", _e)

_FEATURE_NAMES_RU = {
    'sleep_duration':    'Продолжительность сна',
    'stress_level':      'Уровень стресса',
    'heart_rate':        'Пульс',
    'physical_activity': 'Физ. активность',
    'caffeine':          'Кофеин',
    'alcohol':           'Алкоголь',
    'exercise_freq':     'Тренировки',
    'age':               'Возраст',
    'gender':            'Пол',
    'bmi':               'ИМТ',
    'daily_steps':       'Шаги в день',
    'sleep_disorder':    'Расстройство сна',
    'bedtime_hour':      'Время отхода ко сну',
}

# Module-level feature lists — single source of truth
FEATURES_Q = [
    'sleep_duration', 'stress_level', 'heart_rate', 'physical_activity',
    'caffeine', 'alcohol', 'exercise_freq',
    'age', 'gender', 'bmi', 'daily_steps', 'sleep_disorder', 'bedtime_hour',
]
FEATURES_P = [
    'sleep_duration', 'stress_level', 'heart_rate', 'physical_activity',
    'caffeine', 'alcohol', 'exercise_freq', 'age', 'gender',
    'bedtime_sin', 'bedtime_cos', 'sleep_sq', 'age_sq',
]

# ────────────────────────────────────────────────
# Модели данных
# ────────────────────────────────────────────────

class SleepDataInput(BaseModel):
    sleepDuration: float = Field(..., ge=0, le=16)
    stressLevel: float = Field(..., ge=1, le=10)
    heartRate: float = Field(..., ge=20, le=250)
    physicalActivity: Optional[float] = Field(default=30.0, ge=0, le=1440)
    caffeineIntake: Optional[float] = Field(default=0.0, ge=0, le=2000)
    alcoholIntake: Optional[float] = Field(default=0.0, ge=0, le=50)
    exerciseFrequency: Optional[float] = Field(default=3.0, ge=0, le=7)
    age: Optional[float] = Field(default=30.0, ge=10, le=120)
    gender: Optional[float] = Field(default=0.0, ge=0, le=1)
    bedtimeHour: Optional[float] = Field(default=23.0, ge=0, le=23)

class SleepFactor(BaseModel):
    feature: str    # название фактора на русском
    impact: float   # вклад в % пунктах качества (+ улучшает, - ухудшает)

class SleepPredictionOutput(BaseModel):
    predictedQuality: float
    remPercentage: float
    deepSleepPercentage: float
    awakeningsCategory: int   # 0=норма(0-2), 1=нарушен(3+)
    awakeningsLabel: str
    topFactors: list          # топ-3 фактора из SHAP (пустой если SHAP недоступен)
    message: str
    modelVersion: str

# Обратная совместимость — старый формат (только score + message)
class SleepPredictionLegacy(BaseModel):
    predictedQuality: float
    message: str

# ────────────────────────────────────────────────
# Эндпоинты
# ────────────────────────────────────────────────

def _shap_top_factors(raw_q: pd.DataFrame, n: int = 3) -> list:
    """Возвращает топ-N факторов по |SHAP value|, отсортированных по убыванию влияния."""
    if _shap_explainer is None:
        return []
    try:
        sv = _shap_explainer(raw_q).values[0]          # shape: (n_features,)
        cols = raw_q.columns.tolist()
        factors = sorted(
            [
                {
                    "feature": _FEATURE_NAMES_RU.get(c, c),
                    "impact": round(float(sv[i]) * 100, 1),
                }
                for i, c in enumerate(cols)
                if not np.isnan(raw_q.iloc[0][c])      # пропускаем NaN-фичи
            ],
            key=lambda x: abs(x["impact"]),
            reverse=True,
        )
        return factors[:n]
    except Exception as exc:
        logger.warning("SHAP computation failed: %s", exc)
        return []


@app.get("/")
def read_root():
    return {"status": "SleepAI ML Microservice v2 is running!", "model": "GradientBoosting MultiOutput"}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model_q is not None}

@app.post("/predict", response_model=SleepPredictionOutput, dependencies=[Depends(require_internal_token)])
@limiter.limit("60/minute")
def predict_sleep_quality(request: Request, data: SleepDataInput):
    try:
        age          = float(data.age)
        gender       = float(data.gender)
        bedtime_hour = float(data.bedtimeHour)

        # Модель 1: качество
        raw_q = pd.DataFrame([[
            data.sleepDuration, data.stressLevel, data.heartRate,
            data.physicalActivity, data.caffeineIntake, data.alcoholIntake,
            data.exerciseFrequency,
            age, gender,
            np.nan, np.nan, np.nan,
            bedtime_hour,
        ]], columns=FEATURES_Q)
        
        if model_q is not None:
            quality = round(float(np.clip(model_q.predict(raw_q)[0], 0, 1)) * 100, 1)
        else:
            # Fallback heuristic
            score = 100.0 - (data.stressLevel * 4.0) - abs(data.sleepDuration - 8.0) * 5.0
            quality = round(max(0.0, min(100.0, float(score))), 1)

        # Модель 2: фазы
        bedtime_sin = np.sin(2 * np.pi * bedtime_hour / 24)
        bedtime_cos = np.cos(2 * np.pi * bedtime_hour / 24)
        sleep_sq    = data.sleepDuration ** 2
        age_sq      = age ** 2
        raw_p = pd.DataFrame([[
            data.sleepDuration, data.stressLevel, data.heartRate,
            data.physicalActivity, data.caffeineIntake,
            data.alcoholIntake, data.exerciseFrequency,
            age, gender,
            bedtime_sin, bedtime_cos, sleep_sq, age_sq,
        ]], columns=FEATURES_P)
        
        if model_p is not None and isinstance(model_p, dict) and 'rem_pct' in model_p:
            rem_pct  = round(float(np.clip(model_p['rem_pct'].predict(raw_p)[0], 0, 1)) * 100, 1)
            deep_pct = round(float(np.clip(model_p['deep_pct'].predict(raw_p)[0], 0, 1)) * 100, 1)
            awk_cat  = int(model_p['awakenings_clf'].predict(raw_p)[0])
        else:
            # Fallback baseline
            rem_pct = 20.0
            deep_pct = 20.0
            awk_cat = 0
            
        awk_labels = {0: 'норма (0–2)', 1: 'нарушен (3+)'}

        message = generate_message(quality, data)
        return {
            "predictedQuality":    quality,
            "remPercentage":       rem_pct,
            "deepSleepPercentage": deep_pct,
            "awakeningsCategory":  awk_cat,
            "awakeningsLabel":     awk_labels.get(awk_cat, 'неизвестно'),
            "topFactors":          _shap_top_factors(raw_q) if model_q is not None else [],
            "message":             message,
            "modelVersion":        "2.1.0",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def generate_message(quality: float, data: SleepDataInput) -> str:
    tips = []
    if quality >= 80:
        tips.append("Отличное качество сна! Продолжайте в том же духе.")
    elif quality >= 60:
        tips.append("Хорошее качество сна, есть небольшой потенциал для улучшения.")
    else:
        tips.append("Качество сна ниже нормы.")

    if data.sleepDuration < 7:
        tips.append(f"💤 Вы спите {data.sleepDuration}ч — увеличьте до 7-8ч.")
    elif data.sleepDuration > 9:
        tips.append(f"⏰ {data.sleepDuration}ч — немного много, оптимум 7-8ч.")
    if data.stressLevel > 6:
        tips.append("🧘 Высокий стресс — попробуйте технику 4-7-8 перед сном.")
    if data.heartRate > 80:
        tips.append("❤️ Повышенный пульс — исключите кофеин за 6ч до сна.")
    if data.alcoholIntake and data.alcoholIntake > 1:
        tips.append("🍷 Алкоголь снижает REM-фазу на 20-30% — постарайтесь сократить.")
    if data.caffeineIntake and data.caffeineIntake > 200:
        tips.append("☕ Много кофеина — переносите последнюю чашку на до 14:00.")
    if data.exerciseFrequency and data.exerciseFrequency < 2:
        tips.append("🏃 Регулярные тренировки улучшают глубокий сон — попробуйте 3 раза в неделю.")
    return " ".join(tips)


# --- AI Chat endpoint ---

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    user_context: str = Field(default="", max_length=500)
    history: list = []

class ChatResponse(BaseModel):
    reply: str

_FUZZ_THRESHOLD = 82  # 0..100 — empirically: 82 catches typos / morphology, rejects unrelated words

def find_matching_topics(msg: str) -> list:
    """Находит подходящие темы. Сначала точный substring-матч, затем fuzzy по словам.

    Substring пропускает «инсомния» / «не сплю» если их нет в keywords дословно,
    поэтому второй проход разбивает сообщение на слова и сравнивает каждое слово
    с каждым keyword через RapidFuzz partial_ratio. Это ловит опечатки и
    морфологические варианты («бессонницей», «стрессую») без ручной разметки.
    """
    msg_lower = msg.lower().strip()
    matched = []

    # Pass 1 — exact substring (cheap and precise)
    for topic_name, topic_data in TOPICS.items():
        for keyword in topic_data["keywords"]:
            if keyword in msg_lower:
                matched.append(topic_name)
                break

    if matched or not _HAS_FUZZ:
        return matched

    # Pass 2 — fuzzy fallback. Only consider words ≥4 chars (skip "не", "и", "на").
    words = [w for w in msg_lower.split() if len(w) >= 4]
    if not words:
        return matched

    for topic_name, topic_data in TOPICS.items():
        topic_hit = False
        for keyword in topic_data["keywords"]:
            if topic_hit:
                break
            for word in words:
                if fuzz.partial_ratio(word, keyword) >= _FUZZ_THRESHOLD:
                    matched.append(topic_name)
                    topic_hit = True
                    break

    return matched

def _kb_reply(msg: str, context_prefix: str) -> str:
    """Канонический KB-ответ (substring + fuzzy match) — используется как fallback при недоступности LLM."""
    matched_topics = find_matching_topics(msg)
    if matched_topics:
        if len(matched_topics) > 1:
            parts = [random.choice(TOPICS[t]["responses"]) for t in matched_topics[:2]]
            return context_prefix + parts[0] + "\n\n---\n\n" + parts[1]
        return context_prefix + random.choice(TOPICS[matched_topics[0]]["responses"])
    return context_prefix + random.choice(FOLLOW_UPS)


def _llm_reply(msg: str, user_context: str, history: list) -> Optional[str]:
    """Вызывает Claude через Anthropic API. Возвращает None при любой ошибке — caller сделает fallback на KB."""
    if _llm_client is None:
        return None
    try:
        # Строим сообщения: история (если есть, ограничиваем последними 6) + текущее сообщение пользователя.
        messages = []
        for h in (history or [])[-6:]:
            role = h.get("role")
            content = (h.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        user_message = msg
        if user_context:
            user_message = f"[Данные пользователя: {user_context}]\n\n{msg}"
        messages.append({"role": "user", "content": user_message})

        response = _llm_client.messages.create(
            model=LLM_MODEL,
            max_tokens=600,
            system=[
                # Cache the long-lived system prompt — reduces cost on repeated calls.
                {"type": "text", "text": _LLM_SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
            ],
            messages=messages,
        )
        # Anthropic returns content as a list of blocks; pull text.
        text_parts = [b.text for b in response.content if getattr(b, "type", None) == "text"]
        reply = "\n".join(text_parts).strip()
        return reply or None
    except Exception as e:
        logger.warning("LLM call failed, falling back to KB: %s", e)
        return None


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(require_internal_token)])
@limiter.limit("30/minute")
def chat(request: Request, chat_request: ChatRequest):
    """AI-чат: Claude LLM с graceful KB-fallback при недоступности или ошибке."""
    msg = chat_request.message.strip()

    if not msg:
        return {"reply": "Write your question and I'll help! 🌙"}

    # The mobile client renders its own data box from journal/HRV state when
    # user_context is present, so the reply itself stays clean — no language-
    # specific prefix is prepended any more.
    context_prefix = ""

    # 1. Try LLM first — gives the best, contextual answer.
    llm_text = _llm_reply(msg, chat_request.user_context, chat_request.history)
    if llm_text:
        return {"reply": llm_text}

    # 2. Fallback: KB lookup (substring + fuzzy) or generic follow-up.
    return {"reply": _kb_reply(msg, context_prefix)}
