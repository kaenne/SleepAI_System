# Скачивает полезные sleep-датасеты с Kaggle.
# Запускать ПОСЛЕ того как kaggle.json лежит в ~/.kaggle/kaggle.json
import subprocess
import os
import sys
import zipfile
import shutil

PYTHON = sys.executable
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "datasets_raw")
os.makedirs(DATA_DIR, exist_ok=True)

KAGGLE_EXE = os.path.join(os.path.dirname(PYTHON), "Scripts", "kaggle.exe")

# Датасеты для скачивания
# (slug, описание, ожидаемые полезные колонки)
DATASETS = [
    (
        "equilibriumm/sleep-efficiency",          # уже есть, пропустим если файл существует
        "Sleep Efficiency (уже есть)",
    ),
    (
        "henryshan/sleep-health-and-lifestyle",
        "Sleep Health & Lifestyle (ещё один вариант)",
    ),
    (
        "hanaksoy/health-and-sleep-statistics",
        "Health & Sleep Statistics",
    ),
    (
        "orvile/health-and-sleep-relation-2024",
        "Health & Sleep Relation 2024",
    ),
    (
        "ayeshaimran1619/sleep-and-lifestyle-study",
        "Sleep & Lifestyle Study",
    ),
]


def run_kaggle_download(slug: str, dest: str) -> bool:
    """Скачивает датасет через kaggle CLI, возвращает True если успешно."""
    folder = os.path.join(dest, slug.split("/")[-1])
    os.makedirs(folder, exist_ok=True)

    result = subprocess.run(
        [KAGGLE_EXE, "datasets", "download", "-d", slug, "-p", folder, "--unzip"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"  ✅ Скачано: {slug}")
        return True
    else:
        print(f"  ❌ Ошибка: {slug}")
        print(f"     {result.stderr.strip()[:200]}")
        return False


def check_csv_columns(folder: str):
    """Выводит колонки всех CSV-файлов в папке."""
    import pandas as pd
    for root, _, files in os.walk(folder):
        for f in files:
            if f.endswith(".csv"):
                path = os.path.join(root, f)
                try:
                    df = pd.read_csv(path, nrows=3)
                    print(f"\n  📄 {f}  ({len(pd.read_csv(path))} строк)")
                    print(f"     Колонки: {list(df.columns)}")
                except Exception as e:
                    print(f"  ⚠️ Не удалось прочитать {f}: {e}")


def main():
    print("=" * 60)
    print("Скачивание sleep-датасетов с Kaggle")
    print(f"Папка назначения: {DATA_DIR}")
    print("=" * 60)

    # Проверяем kaggle.json
    kaggle_json = os.path.expanduser("~/.kaggle/kaggle.json")
    if not os.path.exists(kaggle_json):
        print("\n❌ Файл kaggle.json не найден!")
        print(f"   Положи его в: {kaggle_json}")
        print("   Скачать можно: kaggle.com → Settings → API → Create New Token")
        return

    print(f"\n✅ kaggle.json найден\n")

    success_count = 0
    for slug, desc in DATASETS:
        print(f"📥 {desc}")
        # Пропускаем Sleep Efficiency — уже есть
        if slug == "equilibriumm/sleep-efficiency":
            print("  ⏭️  Пропускаем (уже есть в проекте)")
            continue
        ok = run_kaggle_download(slug, DATA_DIR)
        if ok:
            success_count += 1

    print(f"\n{'=' * 60}")
    print(f"Итого скачано: {success_count}/{len(DATASETS)-1} датасетов")
    print(f"\n📊 Анализ содержимого:")
    check_csv_columns(DATA_DIR)

    print(f"\n{'=' * 60}")
    print("Следующий шаг: запустить analyze_datasets.py")
    print("чтобы понять какие колонки можно использовать в train_model.py")


if __name__ == "__main__":
    main()
