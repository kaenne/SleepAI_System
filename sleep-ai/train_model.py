import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os
import warnings

# Отключаем лишние предупреждения для чистоты вывода
warnings.filterwarnings('ignore')

def main():
    dataset_path = 'Sleep_health_and_lifestyle_dataset.csv'
    
    # 1. Проверяем, на месте ли файл
    if not os.path.exists(dataset_path):
        print(f"❌ Ошибка: Файл {dataset_path} не найден в текущей папке!")
        return

    print("⏳ Загрузка реальных данных Kaggle...")
    df = pd.read_csv(dataset_path)
    print(f"✅ Данные загружены! Найдено записей: {len(df)}")

    # 2. Выбор признаков (Features) и целевой переменной (Target)
    # Наше мобильное приложение собирает: Часы сна, Стресс (1-10) и Пульс/HRV.
    # Kaggle датасет идеально содержит эти же колонки:
    # 'Sleep Duration', 'Stress Level', 'Heart Rate'
    # Наша цель предсказать: 'Quality of Sleep' (Качество сна от 1 до 10)
    
    expected_columns = ['Sleep Duration', 'Stress Level', 'Heart Rate', 'Quality of Sleep']
    
    # Проверка, что колонки совпадают с ожидаемыми
    missing_cols = [col for col in expected_columns if col not in df.columns]
    if missing_cols:
        print(f"❌ Ошибка: В датасете не найдены нужные колонки: {missing_cols}")
        print(f"Доступные колонки: {list(df.columns)}")
        return

    # Отделяем входные данные (X) от того, что хотим предсказать (y)
    X = df[['Sleep Duration', 'Stress Level', 'Heart Rate']]
    y = df['Quality of Sleep']

    # 3. Разбиваем данные: 80% на обучение, 20% на тест (проверку)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Создаем и обучаем модель (Random Forest - отлично справляется с такими данными)
    print("🧠 Обучение ML-модели (Случайный лес / Random Forest)...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # 5. Оцениваем, насколько ИИ поумнел
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print("\n📊 Результаты тестирования модели:")
    print(f"   - Точность предсказаний (R^2):  {r2 * 100:.1f}%")
    print(f"   - Средняя ошибка (MSE):         {mse:.2f} баллов")

    # 6. Сохраняем "мозг" модели в файл
    model_filename = 'sleep_quality_model.pkl'
    joblib.dump(model, model_filename)
    print(f"\n💾 УСПЕХ! Модель сохранена в файл: {model_filename}")

    # --- ДЕМОНСТРАЦИЯ РАБОТЫ ---
    print("\n🔮 Тестовый прогноз для мобильного приложения:")
    # Представим, что с вашего мобильного телефона пришли данные: 
    # Сон: 7.5 часов, Стресс: 4 из 10, Пульс: 68
    sample_input = np.array([[7.5, 4, 68]])
    sample_prediction = model.predict(sample_input)[0]
    
    print(f"   Введено -> Сон: 7.5ч | Стресс: 4/10 | Пульс: 68 bpm")
    print(f"   AI-оценка качества сна -> {sample_prediction:.1f} из 10")

if __name__ == "__main__":
    main()
