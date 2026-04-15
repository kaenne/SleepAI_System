from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np

# Инициализация приложения FastAPI
app = FastAPI(
    title="SleepAI Prediction API",
    description="Микросервис ИИ для прогнозирования качества сна",
    version="1.0.0"
)

# Загрузка обученной модели при старте сервера
try:
    model = joblib.load('sleep_quality_model.pkl')
    print("✅ ML Модель успешно загружена!")
except Exception as e:
    model = None
    print(f"❌ Ошибка выгрузки модели: {e}")

# Описание формата входящих данных от мобилки/бэкенда
class SleepDataInput(BaseModel):
    sleepDuration: float   # Часы сна (например, 7.5)
    stressLevel: float     # Уровень стресса (от 1 до 10)
    heartRate: float       # Пульс (bpm)

# Описание формата ответа
class SleepPredictionOutput(BaseModel):
    predictedQuality: float
    message: str

@app.get("/")
def read_root():
    return {"status": "SleepAI ML Microservice is running!"}

@app.post("/predict", response_model=SleepPredictionOutput)
def predict_sleep_quality(data: SleepDataInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Модель не загружена на сервере.")
    
    try:
        # Подготовка данных для модели: [Сон, Стресс, Пульс]
        input_features = np.array([[
            data.sleepDuration, 
            data.stressLevel, 
            data.heartRate
        ]])
        
        # Делаем предсказание
        prediction = model.predict(input_features)[0]
        # Округляем до 1 знака после запятой (например, 8.1)
        rounded_prediction = round(float(prediction), 1)
        
        # Генерируем персонализированное сообщение на основе результатов
        message = generate_personalized_message(
            rounded_prediction, data.sleepDuration, data.stressLevel, data.heartRate
        )
        
        return {
            "predictedQuality": rounded_prediction,
            "message": message
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при обработке предсказания: {e}")


def generate_personalized_message(quality: float, sleep: float, stress: float, hr: float) -> str:
    """Генерация персонализированных рекомендаций на основе предсказания."""
    tips = []
    
    if quality >= 8:
        tips.append("Отличное качество сна! Продолжайте в том же духе.")
    elif quality >= 6:
        tips.append("Хорошее качество сна, но есть потенциал для улучшения.")
    else:
        tips.append("Качество сна ниже нормы. Рассмотрите рекомендации ниже.")
    
    if sleep < 7:
        tips.append(f"💤 Вы спите {sleep}ч — попробуйте увеличить до 7-8 часов.")
    elif sleep > 9:
        tips.append(f"⏰ Вы спите {sleep}ч — избыточный сон тоже вреден, оптимум 7-8ч.")
    
    if stress > 6:
        tips.append("🧘 Высокий стресс! Попробуйте дыхательную технику 4-7-8 перед сном.")
    
    if hr > 80:
        tips.append("❤️ Повышенный пульс. Избегайте кофеина за 6ч до сна.")
    
    return " ".join(tips)


# --- AI Chat endpoint ---

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

# База знаний для AI-чата о сне
SLEEP_KNOWLEDGE = {
    "бессонница": "При бессоннице попробуйте: 1) Ложиться и вставать в одно время; 2) Исключить экраны за 1 час до сна; 3) Техника 4-7-8: вдох 4 сек, задержка 7, выдох 8; 4) Прохладная комната (18-20°C).",
    "стресс": "Для снижения стресса перед сном: 🧘 Прогрессивная мышечная релаксация — напрягайте и расслабляйте группы мышц по очереди. 📝 Запишите тревожные мысли в дневник — это поможет «выгрузить» их из головы.",
    "кофе": "Кофеин остаётся в организме до 6-8 часов. Старайтесь пить последнюю чашку не позже 14:00. Замените вечерний кофе ромашковым чаем.",
    "сон": "Норма сна для взрослых — 7-9 часов. Важна не только длительность, но и регулярность: ложитесь и вставайте в одно время даже по выходным.",
    "пульс": "Нормальный пульс в покое — 60-80 уд/мин. Перед сном пульс снижается. Если он повышен, попробуйте глубокое дыхание или лёгкую растяжку.",
    "храп": "Храп может быть признаком апноэ сна. Попробуйте спать на боку. Если храп сильный — обратитесь к сомнологу.",
    "мелатонин": "Мелатонин — гормон сна. Его выработку блокирует синий свет экранов. Используйте режим «ночной смены» на устройствах или очки с блокировкой синего света.",
    "еда": "Не ешьте тяжёлую пищу за 2-3 часа до сна. Лёгкий перекус (банан, миндаль, вишня) может даже помочь заснуть.",
    "спорт": "Физическая активность улучшает сон, но интенсивные тренировки лучше заканчивать за 3-4 часа до отхода ко сну. Вечером подойдёт йога или прогулка.",
    "дыхание": "Дыхательная техника 4-7-8: вдохните через нос 4 секунды, задержите дыхание на 7, медленно выдохните через рот за 8 секунд. Повторите 3-4 цикла.",
}

DEFAULT_REPLIES = [
    "Для хорошего сна важны три вещи: режим, среда и привычки перед сном. Какую тему хотите обсудить подробнее?",
    "Оптимальная температура в спальне — 18-20°C. Тёмная комната и тишина помогают глубже спать.",
    "Попробуйте вести дневник сна: записывайте время засыпания, пробуждения и ощущения утром. Это поможет выявить паттерны.",
    "Синий свет от экрана подавляет мелатонин. Используйте «ночной режим» или откладывайте телефон за час до сна.",
    "Регулярный режим сна — главный фактор качества. Даже по выходным старайтесь не сдвигать время больше чем на 30 минут.",
]


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """AI-чат: простой rule-based ассистент по сну."""
    msg = request.message.lower()
    
    # Ищем ключевые слова в сообщении пользователя
    for keyword, response in SLEEP_KNOWLEDGE.items():
        if keyword in msg:
            return {"reply": response}
    
    # Если не нашли совпадения, отвечаем общей рекомендацией
    import hashlib
    idx = int(hashlib.md5(msg.encode()).hexdigest(), 16) % len(DEFAULT_REPLIES)
    return {"reply": DEFAULT_REPLIES[idx]}
