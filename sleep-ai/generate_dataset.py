import csv
import random

# Количество записей, которое мы хотим сгенерировать
NUM_RECORDS = 5000

def generate_synthetic_data():
    dataset = []
    
    for _ in range(NUM_RECORDS):
        # 1. Возраст случайный от 18 до 65
        age = random.randint(18, 65)
        
        # 2. Уровень стресса (от 1 до 10)
        stress_level = random.randint(1, 10)
        
        # 3. Вариабельность пульса (HRV). Чем выше стресс, тем ниже HRV + случайный шум
        # У здорового человека в покое HRV обычно 40-80, при стрессе может падать до 20-30
        base_hrv = random.uniform(50.0, 85.0)
        hrv_score = base_hrv - (stress_level * 3.5) + random.uniform(-10.0, 10.0)
        hrv_score = max(20.0, min(100.0, hrv_score)) # ограничиваем рамки (20 - 100)
        
        # 4. Часы сна. Высокий стресс обычно снижает продолжительность сна
        base_sleep = random.uniform(6.5, 9.0)
        sleep_hours = base_sleep - (stress_level * 0.25) + random.uniform(-0.8, 0.8)
        sleep_hours = max(3.0, min(12.0, sleep_hours))
        
        # 5. Целевая переменная (Target) - Качество сна (от 0 до 100%)
        # Формула искусственная, но логичная для машинного обучения:
        # Много спишь, низкий стресс и высокий HRV = высокое качество
        quality_base = (sleep_hours / 8.0) * 45  # До 45 баллов за сон
        stress_impact = ((10 - stress_level) / 10.0) * 35  # До 35 баллов за низкий стресс
        hrv_impact = (hrv_score / 100.0) * 20  # До 20 баллов за сердце
        
        sleep_quality_score = quality_base + stress_impact + hrv_impact
        # Добавляем чуточку случайного шума, чтобы модель не выучила очевидную формулу на 100%
        sleep_quality_score += random.uniform(-5.0, 5.0) 
        sleep_quality_score = max(0.0, min(100.0, sleep_quality_score))
        
        dataset.append({
            "age": age,
            "stress_level": stress_level,
            "hrv_score": round(hrv_score, 1),
            "sleep_hours": round(sleep_hours, 1),
            "sleep_quality_score": round(sleep_quality_score, 1)
        })
        
    return dataset

def main():
    print("Начинаем генерацию фейковых данных для SleepAI...")
    records = generate_synthetic_data()
    
    file_name = 'sleep_dataset.csv'
    
    # Сохраняем в CSV формат
    with open(file_name, mode='w', newline='', encoding='utf-8') as file:
        fieldnames = ["age", "stress_level", "hrv_score", "sleep_hours", "sleep_quality_score"]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in records:
            writer.writerow(row)
            
    print(f"✅ Успешно сгенерировано {NUM_RECORDS} записей!")
    print(f"✅ Данные сохранены в файл: {file_name}")

if __name__ == "__main__":
    main()
