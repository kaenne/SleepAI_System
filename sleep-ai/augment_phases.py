"""
Синтетическая аугментация данных фаз сна.

Основана на медицинских исследованиях:
  - REM: 20-25% нормы, снижается с алкоголем (-5% за ед.), возрастом (-0.6% за 10 лет > 40 лет)
  - Глубокий (N3): 15-25% нормы, снижается с возрастом, улучшается от физ. активности
  - Пробуждения: в среднем 2-4 за ночь, растут со стрессом, возрастом, алкоголем

Ссылки: Walker 2017 "Why We Sleep", AASM Sleep Guidelines, Ohayon et al. 2004
"""

import numpy as np
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
N = 3000
rng = np.random.default_rng(42)


def generate_phases_dataset(n: int = N) -> pd.DataFrame:
    # ── Независимые переменные ──────────────────────────────────────────────
    age              = rng.integers(18, 75, n).astype(float)
    gender           = rng.integers(0, 2, n).astype(float)    # 0=F, 1=M
    sleep_duration   = rng.uniform(4.5, 9.5, n)
    # нормальное распределение: большинство людей имеют стресс 3-7, не uniform(1,10)
    stress_level     = np.clip(rng.normal(4.5, 2.0, n), 1.0, 10.0)
    physical_activity= rng.uniform(0, 90, n)                   # мин/день
    caffeine         = rng.uniform(0, 400, n)                  # мг
    alcohol          = rng.uniform(0, 5, n)                    # порции
    exercise_freq    = rng.integers(0, 8, n).astype(float)     # дней/нед
    bedtime_hour     = rng.uniform(20, 27, n) % 24             # 20:00 — 03:00

    # ── REM % ──────────────────────────────────────────────────────────────
    rem_base = rng.uniform(0.18, 0.27, n)
    # возраст > 40: постепенное снижение
    rem_age_effect = np.where(age > 40, -(age - 40) * 0.0006, 0)
    # алкоголь снижает REM
    rem_alcohol = -alcohol * 0.012
    # кофеин немного снижает REM если > 300мг
    rem_caffeine = np.where(caffeine > 300, -(caffeine - 300) * 0.00008, 0)
    # мужчины немного меньше REM
    rem_gender = np.where(gender == 1, -0.01, 0)
    # позднее время сна немного снижает REM
    late_penalty = np.where(bedtime_hour > 1, -(bedtime_hour - 1) * 0.005, 0)
    rem_pct = rem_base + rem_age_effect + rem_alcohol + rem_caffeine + rem_gender + late_penalty
    rem_pct += rng.normal(0, 0.025, n)
    rem_pct = np.clip(rem_pct, 0.05, 0.40)

    # ── Глубокий сон (N3) % ────────────────────────────────────────────────
    deep_base = rng.uniform(0.13, 0.25, n)
    # возраст снижает глубокий сон значительно
    deep_age_effect = np.where(age > 30, -(age - 30) * 0.002, 0)
    # физ. активность улучшает глубокий сон
    deep_activity = physical_activity * 0.0008
    # алкоголь (малые дозы поначалу увеличивают N3, потом снижают)
    deep_alcohol = np.where(alcohol <= 1, alcohol * 0.01, -alcohol * 0.015)
    # длинный сон — чуть меньше % глубокого (эффект dilution)
    deep_sleep_len = -(sleep_duration - 7.0) * 0.008
    deep_pct = deep_base + deep_age_effect + deep_activity + deep_alcohol + deep_sleep_len
    deep_pct += rng.normal(0, 0.03, n)
    deep_pct = np.clip(deep_pct, 0.02, 0.35)

    # ── Пробуждения ────────────────────────────────────────────────────────
    awk_base = rng.exponential(1.8, n) + 0.5
    # возраст увеличивает пробуждения
    awk_age = np.where(age > 50, (age - 50) * 0.04, 0)
    # алкоголь нарушает вторую половину ночи
    awk_alcohol = alcohol * 0.4
    # короткий сон — меньше пробуждений по времени (но они всё равно есть)
    awk_short = np.where(sleep_duration < 6, -0.5, 0)
    # физ. активность немного снижает пробуждения
    awk_activity = -physical_activity * 0.005
    awakenings = awk_base + awk_age + awk_alcohol + awk_short + awk_activity
    awakenings += rng.normal(0, 0.5, n)
    awakenings = np.clip(np.round(awakenings), 0, 10)

    # ── Качество сна (для quality модели) ─────────────────────────────────
    # Калибровка: avg quality должен быть ~0.68 (соответствует реальным датасетам 0.73-0.79)
    # stress_level используется напрямую — модель учит реальную корреляцию
    q_base   = 0.10 + (sleep_duration / 8.0) * 0.50   # при 7ч: 0.54
    q_stress = ((10.0 - stress_level) / 10.0) * 0.28  # при stress=4.5: 0.154
    q_phases = rem_pct * 0.10 + deep_pct * 0.10
    q_awk    = -np.log1p(awakenings) * 0.03
    q_alcohol= -alcohol * 0.012
    q_late   = np.where(bedtime_hour > 1.0, -(bedtime_hour - 1.0) * 0.008, 0)
    q_age    = np.where(age > 60, -0.03, 0)
    quality  = q_base + q_stress + q_phases + q_awk + q_alcohol + q_late + q_age
    quality += rng.normal(0, 0.03, n)
    quality  = np.clip(quality, 0.10, 1.0)

    df = pd.DataFrame({
        'sleep_duration':    np.round(sleep_duration, 2),
        'stress_level':      np.round(stress_level, 1),   # теперь коррелирует с quality
        'heart_rate':        rng.uniform(50, 90, n).round(0),
        'physical_activity': np.round(physical_activity, 1),
        'caffeine':          np.round(caffeine, 1),
        'alcohol':           np.round(alcohol, 2),
        'exercise_freq':     exercise_freq,
        'age':               age,
        'gender':            gender,
        'bmi':               np.nan,
        'daily_steps':       np.nan,
        'sleep_disorder':    np.nan,
        'bedtime_hour':      np.round(bedtime_hour, 2),
        'rem_pct':           np.round(rem_pct, 4),
        'deep_pct':          np.round(deep_pct, 4),
        'awakenings':        awakenings,
        'quality':           np.round(quality, 4),
        'source':            'synthetic',
    })
    return df


N_BAD = 600   # плохой сон (quality 0.05-0.30) — почти отсутствует в реальных данных


def generate_bad_sleep(n: int = N_BAD) -> pd.DataFrame:
    """
    Инсомния / апноэ / сильный стресс: quality 0.05–0.30.
    Health dataset содержит только quality 4-9 (0.4-0.9), поэтому модель
    никогда не видела по-настоящему плохого сна без этих строк.
    """
    sleep_dur     = rng.uniform(2.5, 5.0, n)
    stress_level  = rng.uniform(7.0, 10.0, n)
    heart_rate    = rng.uniform(72, 100, n)
    physical_act  = rng.uniform(0, 15, n)
    caffeine      = rng.uniform(150, 500, n)
    alcohol       = rng.uniform(0, 6, n)
    exercise_freq = rng.uniform(0, 1.5, n)
    age           = rng.uniform(25, 70, n)
    gender        = rng.integers(0, 2, n).astype(float)
    bmi           = rng.choice([1.0, 2.0], size=n, p=[0.35, 0.65]).astype(float)
    daily_steps   = rng.uniform(500, 4000, n)
    disorder      = rng.choice([1.0, 2.0], size=n, p=[0.55, 0.45]).astype(float)
    bedtime_hour  = rng.uniform(1.5, 5.5, n)   # 1:30–5:30 утра

    # Очень плохие фазы: мало REM, мало глубокого, много пробуждений
    rem_pct    = np.clip(rng.normal(0.10, 0.03, n), 0.04, 0.18)
    deep_pct   = np.clip(rng.normal(0.06, 0.025, n), 0.02, 0.13)
    awakenings = np.clip(rng.normal(7.0, 2.0, n), 3.0, 12.0)

    quality = (
        (sleep_dur / 8.0) * 0.40
        + ((10.0 - stress_level) / 10.0) * 0.35
        + rem_pct * 0.12
        + deep_pct * 0.13
        - awakenings * 0.012
        + rng.normal(0, 0.025, n)
    )
    quality = np.clip(quality, 0.05, 0.30)

    return pd.DataFrame({
        'sleep_duration':    np.round(sleep_dur, 2),
        'stress_level':      np.round(stress_level, 1),
        'heart_rate':        np.round(heart_rate, 1),
        'physical_activity': np.round(physical_act, 1),
        'caffeine':          np.round(caffeine, 1),
        'alcohol':           np.round(alcohol, 2),
        'exercise_freq':     np.round(exercise_freq, 1),
        'age':               np.round(age, 1),
        'gender':            gender,
        'bmi':               bmi,
        'daily_steps':       np.round(daily_steps, 0),
        'sleep_disorder':    disorder,
        'bedtime_hour':      np.round(bedtime_hour, 2),
        'rem_pct':           np.round(rem_pct, 4),
        'deep_pct':          np.round(deep_pct, 4),
        'awakenings':        np.round(awakenings, 1),
        'quality':           np.round(quality, 4),
        'source':            'synthetic_bad',
    })


if __name__ == '__main__':
    out_path = os.path.join(BASE_DIR, 'synthetic_phases.csv')

    df_main = generate_phases_dataset(N)
    df_bad  = generate_bad_sleep(N_BAD)
    df = pd.concat([df_main, df_bad], ignore_index=True)

    df.to_csv(out_path, index=False)
    print(f"Saved {len(df)} rows -> {out_path}")
    print(f"  General  : {len(df_main)} rows  quality {df_main.quality.min():.2f}-{df_main.quality.max():.2f}")
    print(f"  Bad sleep: {len(df_bad)} rows  quality {df_bad.quality.min():.2f}-{df_bad.quality.max():.2f}")

    bins   = [0, 0.30, 0.50, 0.70, 0.90, 1.01]
    labels = ['<0.30 (bad)', '0.30-0.50', '0.50-0.70', '0.70-0.90', '>0.90 (great)']
    print("  Quality distribution:")
    for lo, hi, lbl in zip(bins, bins[1:], labels):
        cnt = ((df['quality'] >= lo) & (df['quality'] < hi)).sum()
        bar = '#' * (cnt // 30)
        print(f"    {lbl:18s} {cnt:4d}  {bar}")
