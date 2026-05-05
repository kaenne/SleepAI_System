import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV, cross_val_score, StratifiedKFold
from sklearn.ensemble import HistGradientBoostingRegressor, HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, classification_report, accuracy_score
import joblib
import os
import warnings

warnings.filterwarnings('ignore')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

BMI_MAP = {
    'Normal': 0.0, 'Normal Weight': 0.0,
    'Overweight': 1.0,
    'Obese': 2.0, 'Obese I': 2.0, 'Obese II': 3.0, 'Obese III': 4.0,
}
DISORDER_MAP = {'None': 0.0, 'Insomnia': 1.0, 'Sleep Apnea': 2.0}

FEATURES_QUALITY = [
    'sleep_duration', 'stress_level', 'heart_rate', 'physical_activity',
    'caffeine', 'alcohol', 'exercise_freq',
    'age', 'gender', 'bmi', 'daily_steps', 'sleep_disorder', 'bedtime_hour',
]

FEATURES_PHASES = [
    'sleep_duration', 'stress_level', 'heart_rate', 'physical_activity', 'caffeine', 'alcohol',
    'exercise_freq', 'age', 'gender',
    'bedtime_sin', 'bedtime_cos',
    'sleep_sq', 'age_sq',
]


def add_phase_features(df):
    df = df.copy()
    bh = df['bedtime_hour'].fillna(23.0)
    df['bedtime_sin'] = np.sin(2 * np.pi * bh / 24)
    df['bedtime_cos'] = np.cos(2 * np.pi * bh / 24)
    df['sleep_sq']    = df['sleep_duration'] ** 2
    df['age_sq']      = df['age'] ** 2
    return df


def load_health_dataset(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    out = pd.DataFrame()
    out['sleep_duration']    = df['Sleep Duration'].astype(float)
    out['stress_level']      = df['Stress Level'].astype(float)
    out['heart_rate']        = df['Heart Rate'].astype(float)
    out['physical_activity'] = df['Physical Activity Level'].astype(float)
    out['caffeine']          = np.nan
    out['alcohol']           = np.nan
    out['exercise_freq']     = out['physical_activity'] / 100.0 * 7.0
    out['age']               = df['Age'].astype(float)
    out['gender']            = (df['Gender'] == 'Male').astype(float)
    out['bmi']               = df['BMI Category'].map(BMI_MAP).fillna(1.0)
    out['daily_steps']       = df['Daily Steps'].astype(float)
    out['sleep_disorder']    = df['Sleep Disorder'].fillna('None').map(DISORDER_MAP).fillna(0.0)
    out['bedtime_hour']      = np.nan
    out['quality']           = df['Quality of Sleep'].astype(float) / 10.0
    out['rem_pct']           = np.nan
    out['deep_pct']          = np.nan
    out['awakenings']        = np.nan
    out['source']            = 'health'
    return out


def load_efficiency_dataset(path: str) -> pd.DataFrame:
    df = pd.read_csv(path).dropna(subset=['Sleep efficiency', 'REM sleep percentage',
                                          'Deep sleep percentage'])
    bedtime_hour = pd.to_datetime(df['Bedtime'], errors='coerce').dt.hour.fillna(23)
    out = pd.DataFrame()
    out['sleep_duration']    = df['Sleep duration'].astype(float)
    out['stress_level']      = np.nan
    out['heart_rate']        = np.nan
    out['physical_activity'] = df['Exercise frequency'].fillna(0).astype(float) * 14.0
    out['caffeine']          = df['Caffeine consumption'].fillna(0).astype(float)
    out['alcohol']           = df['Alcohol consumption'].fillna(0).astype(float)
    out['exercise_freq']     = df['Exercise frequency'].fillna(0).astype(float)
    out['age']               = df['Age'].astype(float)
    out['gender']            = (df['Gender'] == 'Male').astype(float)
    out['bmi']               = np.nan
    out['daily_steps']       = np.nan
    out['sleep_disorder']    = np.nan
    out['bedtime_hour']      = bedtime_hour.astype(float)
    out['quality']           = df['Sleep efficiency'].astype(float)
    out['rem_pct']           = df['REM sleep percentage'].astype(float) / 100.0
    out['deep_pct']          = df['Deep sleep percentage'].astype(float) / 100.0
    out['awakenings']        = df['Awakenings'].fillna(0).astype(float)
    out['source']            = 'efficiency'
    return out


def load_mmash_dataset(base_dir: str) -> pd.DataFrame:
    # MMASH: 22 subjects x 2 nights = ~44 rows. REM/Deep не измерялись -> только quality-модель.
    data_dir = os.path.join(
        base_dir,
        'multilevel-monitoring-of-activity-and-sleep-in-healthy-people-1.0.0',
        'DataPaper',
    )
    if not os.path.exists(data_dir):
        return pd.DataFrame()

    rows = []
    for user_folder in sorted(os.listdir(data_dir)):
        user_path = os.path.join(data_dir, user_folder)
        if not os.path.isdir(user_path):
            continue
        try:
            uinfo  = pd.read_csv(os.path.join(user_path, 'user_info.csv'))
            age    = float(uinfo['Age'].iloc[0])
            gender = 1.0 if str(uinfo['Gender'].iloc[0]).strip().upper() == 'M' else 0.0
            weight = float(uinfo['Weight'].iloc[0])
            height = float(uinfo['Height'].iloc[0])
            bmi_val = weight / (height / 100.0) ** 2
            bmi_cat = 0.0 if bmi_val < 25 else (1.0 if bmi_val < 30 else 2.0)

            quest   = pd.read_csv(os.path.join(user_path, 'questionnaire.csv'))
            # Daily_stress ~0-40 → нормируем в диапазон 1-8 (как в health датасете)
            stress_raw = float(quest['Daily_stress'].iloc[0])
            stress_norm = np.clip(stress_raw / 5.0, 1.0, 8.0)

            actig = pd.read_csv(os.path.join(user_path, 'Actigraph.csv'))
            daily_steps = actig.groupby('day')['Steps'].sum().mean()
            hr_ok = actig['HR'][actig['HR'] > 0]
            avg_hr = float(hr_ok.mean()) if len(hr_ok) > 0 else np.nan

            sleep_df = pd.read_csv(os.path.join(user_path, 'sleep.csv'))
            for _, srow in sleep_df.iterrows():
                tst_hours  = float(srow['Total Sleep Time (TST)']) / 60.0
                quality    = float(srow['Efficiency']) / 100.0
                awakenings = float(srow['Number of Awakenings'])
                try:
                    bedtime_hour = float(str(srow['In Bed Time']).split(':')[0])
                except Exception:
                    bedtime_hour = np.nan

                rows.append({
                    'sleep_duration':    tst_hours,
                    'stress_level':      stress_norm,
                    'heart_rate':        avg_hr,
                    'physical_activity': np.nan,
                    'caffeine':          np.nan,
                    'alcohol':           np.nan,
                    'exercise_freq':     np.nan,
                    'age':               age,
                    'gender':            gender,
                    'bmi':               bmi_cat,
                    'daily_steps':       daily_steps,
                    'sleep_disorder':    0.0,
                    'bedtime_hour':      bedtime_hour,
                    'quality':           quality,
                    'rem_pct':           np.nan,
                    'deep_pct':          np.nan,
                    'awakenings':        awakenings,
                    'source':            'mmash',
                })
        except Exception as e:
            print(f"   [WARN] {user_folder}: {e}")
            continue

    return pd.DataFrame(rows)


def main():
    path_health = os.path.join(BASE_DIR, 'Sleep_health_and_lifestyle_dataset.csv')
    path_eff    = os.path.join(BASE_DIR, 'Sleep_Efficiency.csv')
    path_synth  = os.path.join(BASE_DIR, 'synthetic_phases.csv')

    frames = []
    for path, loader, label in [(path_health, load_health_dataset, 'Sleep_health'),
                                 (path_eff,   load_efficiency_dataset, 'Sleep_Efficiency')]:
        if os.path.exists(path):
            df = loader(path)
            frames.append(df)
            print(f"✅ {label}: {len(df)} записей")
        else:
            print(f"⚠️  {label}: не найден")

    mmash = load_mmash_dataset(BASE_DIR)
    if not mmash.empty:
        frames.append(mmash)
        print(f"✅ MMASH (PhysioNet): {len(mmash)} записей (реальные данные, 22 участника)")

    # C: синтетические данные фаз (медицинские зависимости)
    if os.path.exists(path_synth):
        syn = pd.read_csv(path_synth)
        # взвешиваем синтетику x0.4 — реальные данные важнее
        syn = syn.sample(frac=0.4, random_state=42).reset_index(drop=True)
        frames.append(syn)
        print(f"✅ Synthetic phases: {len(syn)} записей (40% от {int(len(syn)/0.4)})")
    else:
        print("⚠️  synthetic_phases.csv не найден — запустите augment_phases.py")

    if not frames:
        print("❌ Нет данных!"); return

    data = pd.concat(frames, ignore_index=True)
    print(f"📦 Итого: {len(data)} записей\n")

    # ── Модель 1: Качество сна ───────────────────────────────────────────────
    # HistGBR нативно обрабатывает NaN — не нужно fillna
    # 13 фичей: добавили age, bmi, daily_steps, sleep_disorder из Health датасета
    print("─── Модель 1: Качество сна (HistGBR + 13 фичей + RandomizedSearch) ───")
    Xq = data[FEATURES_QUALITY]
    yq = data['quality']
    Xq_tr, Xq_te, yq_tr, yq_te = train_test_split(Xq, yq, test_size=0.2, random_state=42)

    param_dist = {
        'max_iter':          [200, 300, 500, 700],
        'learning_rate':     [0.02, 0.05, 0.08, 0.1],
        'max_depth':         [3, 4, 5, 6],
        'min_samples_leaf':  [10, 15, 20, 30],
        'l2_regularization': [0.0, 0.1, 0.5, 1.0],
    }
    search = RandomizedSearchCV(
        HistGradientBoostingRegressor(random_state=42),
        param_dist, n_iter=60, cv=5, scoring='r2', n_jobs=-1, random_state=42,
    )
    search.fit(Xq_tr, yq_tr)
    model_q = search.best_estimator_

    pred_q = model_q.predict(Xq_te)
    r2_q   = r2_score(yq_te, pred_q)
    mse_q  = mean_squared_error(yq_te, pred_q)
    # Стратифицированный CV по источнику — гарантирует одинаковое соотношение
    # источников в каждом фолде (health/efficiency/mmash/synthetic)
    source_labels = pd.Categorical(data['source']).codes
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_splits = list(skf.split(Xq, source_labels))
    cv_q   = cross_val_score(model_q, Xq, yq, cv=cv_splits, scoring='r2')
    bp = search.best_params_
    print(f"   Лучшие: lr={bp['learning_rate']} depth={bp['max_depth']} iter={bp['max_iter']}")
    print(f"   quality  test  R²={r2_q*100:.1f}%  MSE={mse_q:.5f}  (n={len(Xq_tr)})")
    print(f"   quality  5-CV  R²={cv_q.mean()*100:.1f}% ± {cv_q.std()*100:.1f}%")

    scaler_q = StandardScaler()
    scaler_q.fit(data[FEATURES_QUALITY].fillna(data[FEATURES_QUALITY].mean()))

    # ── Модель 2: Фазы сна ───────────────────────────────────────────────────
    # 3 отдельных HistGBR (rem, deep, awakenings)
    # awakenings → log1p transform (счётная переменная, не нормальное распределение)
    # cyclical bedtime encoding, нелинейные фичи sleep², age²
    print("\n─── Модель 2: Фазы сна (3×HistGBR + cyclic bedtime + poly features) ───")
    eff = add_phase_features(
        data[data['source'].isin(['efficiency', 'synthetic'])].dropna(subset=['rem_pct', 'deep_pct', 'awakenings'])
    )
    Xp = eff[FEATURES_PHASES]
    idx_tr, idx_te = train_test_split(eff.index.to_numpy(), test_size=0.2, random_state=42)
    Xp_tr, Xp_te   = Xp.loc[idx_tr], Xp.loc[idx_te]
    eff_tr, eff_te  = eff.loc[idx_tr], eff.loc[idx_te]

    scaler_p = StandardScaler()
    scaler_p.fit(Xp.fillna(Xp.mean()))

    models_p = {}

    # REM и Deep — регрессия (непрерывные величины)
    for name, y_tr, y_te in [
        ('rem_pct',  eff_tr['rem_pct'],  eff_te['rem_pct']),
        ('deep_pct', eff_tr['deep_pct'], eff_te['deep_pct']),
    ]:
        h = HistGradientBoostingRegressor(
            max_iter=400, learning_rate=0.05, max_depth=4,
            min_samples_leaf=15, random_state=42,
        )
        h.fit(Xp_tr, y_tr)
        pred = h.predict(Xp_te)
        r2  = r2_score(y_te, pred)
        mse = mean_squared_error(y_te, pred)
        print(f"   {name:<17} R²={r2*100:.1f}%  MSE={mse:.5f}  (n={len(Xp_tr)})")
        models_p[name] = h

    # Пробуждения — бинарная классификация: 0=норма(0-2), 1=нарушен(3+)
    # Бинарная лучше трёхклассовой: класс "тяжёлая(6+)" слишком мал (< 10% данных)
    awk_tr = (eff_tr['awakenings'] >= 3).astype(int)
    awk_te = (eff_te['awakenings'] >= 3).astype(int)
    clf = HistGradientBoostingClassifier(
        max_iter=400, learning_rate=0.05, max_depth=4,
        min_samples_leaf=10, class_weight='balanced', random_state=42,
    )
    clf.fit(Xp_tr, awk_tr)
    awk_pred = clf.predict(Xp_te)
    acc = accuracy_score(awk_te, awk_pred)
    print(f"   awakenings_class  Acc={acc*100:.1f}%  (n={len(Xp_tr)})  0=норма 1=нарушен")
    print(classification_report(awk_te, awk_pred, target_names=['норма(0-2)', 'нарушен(3+)'], zero_division=0))
    models_p['awakenings_clf'] = clf

    # ── Сохранение ───────────────────────────────────────────────────────────
    joblib.dump(model_q,          os.path.join(BASE_DIR, 'model_quality.pkl'))
    joblib.dump(scaler_q,         os.path.join(BASE_DIR, 'scaler_quality.pkl'))
    joblib.dump(models_p,         os.path.join(BASE_DIR, 'model_phases.pkl'))
    joblib.dump(scaler_p,         os.path.join(BASE_DIR, 'scaler_phases.pkl'))
    joblib.dump(FEATURES_QUALITY, os.path.join(BASE_DIR, 'features_quality.pkl'))
    joblib.dump(FEATURES_PHASES,  os.path.join(BASE_DIR, 'features_phases.pkl'))
    # обратная совместимость
    joblib.dump(model_q,          os.path.join(BASE_DIR, 'sleep_quality_model.pkl'))
    joblib.dump(scaler_q,         os.path.join(BASE_DIR, 'sleep_scaler.pkl'))
    joblib.dump(FEATURES_QUALITY, os.path.join(BASE_DIR, 'sleep_features.pkl'))

    # Фоновая выборка для SHAP (100 строк из train, покрывает всё распределение)
    shap_bg = Xq_tr.sample(min(100, len(Xq_tr)), random_state=42).reset_index(drop=True)
    joblib.dump(shap_bg, os.path.join(BASE_DIR, 'shap_background.pkl'))
    print("\n💾 Все модели сохранены!")

    # ── Демо ─────────────────────────────────────────────────────────────────
    print("\n🔮 Тестовый прогноз (7.5ч, стресс 4, пульс 68, возраст 25, BMI норма):")
    s_q = pd.DataFrame([[7.5, 4, 68, 30, 0, 0, 3, 25, 0, 0, 6000, 0, 23]],
                        columns=FEATURES_QUALITY)
    q = model_q.predict(s_q)[0]
    s_p = pd.DataFrame([[7.5, 4, 68, 30, 0, 0, 3, 25, 0,
                          np.sin(2 * np.pi * 23 / 24),
                          np.cos(2 * np.pi * 23 / 24),
                          7.5**2, 25**2]],
                        columns=FEATURES_PHASES)
    rem  = models_p['rem_pct'].predict(s_p)[0]
    deep = models_p['deep_pct'].predict(s_p)[0]
    awk_cls = models_p['awakenings_clf'].predict(s_p)[0]
    awk_labels = {0: 'норма (0-2)', 1: 'нарушен (3-5)', 2: 'тяжёлая (6+)'}
    awk_labels = {0: 'норма (0-2)', 1: 'нарушен (3+)'}
    print(f"   Качество сна:  {q*100:.1f}%")
    print(f"   REM фаза:      {rem*100:.1f}%")
    print(f"   Глубокий сон:  {deep*100:.1f}%")
    print(f"   Пробуждения:   {awk_labels[int(awk_cls)]}")


if __name__ == "__main__":
    main()