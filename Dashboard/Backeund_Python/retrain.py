import pandas as pd
import numpy as np
import dill
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split, cross_val_score, KFold, learning_curve
from sklearn.svm import SVR
from sklearn.ensemble import RandomForestRegressor, StackingRegressor
from catboost import CatBoostRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import FunctionTransformer
from sklearn.linear_model import ElasticNet

# Fungsi untuk melakukan Winsorization pada fitur
def winsorize_data(X, lower_percentile=0.05, upper_percentile=0.95):
    """
    Melakukan Winsorization pada data untuk mengatasi outliers.
    """
    # Pastikan input adalah DataFrame
    X_df = pd.DataFrame(X)
    for column in X_df.columns:
        lower_bound = X_df[column].quantile(lower_percentile)
        upper_bound = X_df[column].quantile(upper_percentile)
        X_df[column] = X_df[column].clip(lower=lower_bound, upper=upper_bound)
    return X_df.values # Kembalikan sebagai numpy array agar konsisten dengan pipeline

# Fungsi untuk feature engineering
def feature_engineering(X):
    """
    Melakukan feature engineering pada dataset, menambah fitur baru berdasarkan interaksi dan kuadrat
    dari fitur yang ada.
    """
    X_df = pd.DataFrame(X, columns=['pressure', 'temperature', 'flow'])
    X_df['temperature_squared'] = X_df['temperature']**2
    X_df['pressure_squared'] = X_df['pressure']**2
    X_df['flow_squared'] = X_df['flow']**2
    X_df['pressure_temperature_interaction'] = X_df['pressure'] * X_df['temperature']
    X_df['pressure_flow_interaction'] = X_df['pressure'] * X_df['flow']
    X_df['temperature_flow_interaction'] = X_df['temperature'] * X_df['flow']
    X_df['log_pressure'] = np.log1p(X_df['pressure']) # Menggunakan log1p untuk stabilitas numerik
    X_df['log_temperature'] = np.log1p(X_df['temperature'])
    X_df['log_flow'] = np.log1p(X_df['flow'])
    return X_df

# Fungsi untuk menghitung Adjusted R²
def adjusted_r2(r2, n, p):
    """
    Menghitung Adjusted R².
    r2  : R² yang dihitung dari model
    n   : jumlah data
    p   : jumlah fitur/variabel independen
    """
    return 1 - (1 - r2) * (n - 1) / (n - p - 1)

# --- 1. Memuat dan Eksplorasi Data ---
data_path = 'DataTrainHistorisRealls.xlsx'
data = pd.read_excel(data_path)

# Tampilkan beberapa baris pertama
print("Data Head:")
print(data.head())

# Deskripsi Statistik Fitur
print("\nDeskripsi Statistik Fitur:")
print(data.describe())

# Cek Nilai Hilang
print("\nJumlah Nilai Hilang pada Setiap Fitur:")
print(data.isnull().sum())

# Visualisasi (opsional, bisa di-skip jika hanya ingin training)
plt.figure(figsize=(12, 6))
sns.pairplot(data[['pressure', 'temperature', 'flow', 'power_potential']])
plt.suptitle("Pairplot of Features and Target Variable", y=1.02)
plt.show()

plt.figure(figsize=(8, 6))
sns.heatmap(data[['pressure', 'temperature', 'flow', 'power_potential']].corr(), annot=True, cmap="coolwarm", fmt='.2f')
plt.title("Korelasi Antar Fitur")
plt.show()

# --- 2. Preprocessing dan Feature Engineering ---
# Pisahkan fitur dan target
X = data[['pressure', 'temperature', 'flow']]
y = data['power_potential']

# Pisahkan data menjadi set latih dan uji
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Buat pipeline preprocessing
# Pipeline ini akan menangani feature engineering, imputasi nilai hilang, dan scaling
preprocessing_pipeline = Pipeline(steps=[
    ('feature_engineering', FunctionTransformer(feature_engineering)),
    ('imputer', SimpleImputer(strategy='mean')),
    ('scaler', RobustScaler()),
    ('winsorizer', FunctionTransformer(winsorize_data)) # Winsorization ditambahkan di akhir
])

# Terapkan preprocessing pipeline pada data latih dan uji
X_train_processed = preprocessing_pipeline.fit_transform(X_train)
X_test_processed = preprocessing_pipeline.transform(X_test)

# Dapatkan nama fitur setelah feature engineering untuk evaluasi
processed_cols = feature_engineering(X_train).columns
print(f"\nJumlah fitur setelah feature engineering: {len(processed_cols)}")
print(f"Nama fitur: {processed_cols.tolist()}")

# --- 3. Definisi dan Pelatihan Model ---
# Definisikan model dasar (base learners)
svr = SVR(C=100, gamma='scale', kernel='rbf', epsilon=0.05)
elasticnet_model = ElasticNet(alpha=0.1, l1_ratio=0.5)
catboost = CatBoostRegressor(iterations=1200, depth=8, l2_leaf_reg=6, learning_rate=0.05, silent=True, random_state=42)
random_forest = RandomForestRegressor(n_estimators=1200, max_depth=15, min_samples_split=3, min_samples_leaf=1, max_features='sqrt', bootstrap=False, random_state=42)

# Definisikan stacking regressor dengan CatBoost sebagai meta-learner
stacking_regressor = StackingRegressor(
    estimators=[
        ('svr', svr),
        ('elasticnet', elasticnet_model),
        ('catboost', catboost),
        ('random_forest', random_forest)
    ],
    final_estimator=CatBoostRegressor(
        iterations=1200, depth=8, l2_leaf_reg=8, learning_rate=0.03, silent=True, random_state=42
    ),
    cv=10
)

# Pipeline model utama (hanya berisi model karena preprocessing sudah dilakukan)
model_pipeline = Pipeline(steps=[('stacking_regressor', stacking_regressor)])

# Latih model
print("\nMemulai pelatihan model Stacking... Ini mungkin memakan waktu beberapa menit.")
model_pipeline.fit(X_train_processed, y_train)
print("Pelatihan model selesai.")

# --- 4. Simpan Artefak Model dan Preprocessing ---
# Simpan pipeline model yang sudah dilatih
with open('modelpredictrobust_pipeline.dill', 'wb') as f:
    dill.dump(model_pipeline, f)
print("Pipeline model berhasil disimpan ke 'modelpredictrobust2_pipeline.dill'")

# Simpan pipeline preprocessing
with open('preprocessingpredictrobust2_pipeline.dill', 'wb') as f:
    dill.dump(preprocessing_pipeline, f)
print("Pipeline preprocessing berhasil disimpan ke 'preprocessingpredictrobust_pipeline.dill'")

# --- 5. Evaluasi Model ---
y_pred = model_pipeline.predict(X_test_processed)

# Hitung metrik evaluasi
mse = mean_squared_error(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

# Hitung Adjusted R²
n = len(y_test)
p = X_test_processed.shape[1]
adjusted_r2_value = adjusted_r2(r2, n, p)

# Tampilkan hasil evaluasi
print("\n--- Hasil Evaluasi Model pada Data Uji ---")
print(f"Mean Squared Error (MSE) : {mse:.4f}")
print(f"Mean Absolute Error (MAE): {mae:.4f}")
print(f"R-squared (R2 Score)     : {r2:.4f}")
print(f"Adjusted R-squared       : {adjusted_r2_value:.4f}")

# Evaluasi dengan Cross-validation
print("\nMemulai Cross-Validation...")
cv_scores = cross_val_score(model_pipeline, X_train_processed, y_train, cv=10, scoring='r2')
print("Cross-Validation selesai.")
print(f"CV R2 Scores: {np.round(cv_scores, 4)}")
print(f"CV R2 Mean  : {cv_scores.mean():.4f}")
print(f"CV R2 Std   : {cv_scores.std():.4f}")

# --- 6. Visualisasi Hasil ---
# Plot Aktual vs Prediksi
results = pd.DataFrame({'Actual Power': y_test, 'Predicted Power': y_pred})
plt.figure(figsize=(10, 6))
sns.scatterplot(x='Actual Power', y='Predicted Power', data=results, alpha=0.6)
plt.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], color='red', linestyle='--', lw=2, label='Ideal Line')
plt.title('Aktual vs. Prediksi Power Potential')
plt.xlabel('Actual Power')
plt.ylabel('Predicted Power')
plt.legend()
plt.grid(True)
plt.show()

# Simpan hasil prediksi ke Excel
predictions_df = pd.DataFrame({
    'Predicted Power Potential': y_pred,
    'Actual Power Potential': y_test.values,
    'Absolute Error': np.abs(y_test.values - y_pred)
})
predictions_df.to_excel('predictions_results_modelrobust.xlsx', index=False)
print("\nHasil prediksi disimpan ke 'predictions_results_modelrobust.xlsx'")

# Visualisasi kurva pembelajaran
print("\nMembuat kurva pembelajaran...")
train_sizes, train_scores, test_scores = learning_curve(
    model_pipeline, X_train_processed, y_train, cv=5, scoring='r2',
    train_sizes=np.linspace(0.1, 1.0, 10), n_jobs=-1, random_state=42
)

train_scores_mean = train_scores.mean(axis=1)
test_scores_mean = test_scores.mean(axis=1)

plt.figure(figsize=(10, 6))
plt.plot(train_sizes, train_scores_mean, 'o-', color="r", label="Training score")
plt.plot(train_sizes, test_scores_mean, 'o-', color="g", label="Cross-validation score")
plt.title("Learning Curve")
plt.xlabel("Training examples")
plt.ylabel("R2 Score")
plt.legend(loc="best")
plt.grid(True)
plt.show()