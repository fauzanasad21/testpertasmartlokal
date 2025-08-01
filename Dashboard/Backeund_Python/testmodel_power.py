import dill
import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import time
import random

# Feature Engineering class
class FeatureEngineering(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    
    def transform(self, X):
        X['temperature_squared'] = X['temperature']**2
        X['pressure_squared'] = X['pressure']**2
        X['flow_squared'] = X['flow']**2

        X['pressure_temperature_interaction'] = X['pressure'] * X['temperature']
        X['pressure_flow_interaction'] = X['pressure'] * X['flow']
        X['temperature_flow_interaction'] = X['temperature'] * X['flow']

        X['log_pressure'] = np.log(X['pressure'] + 1)  # +1 untuk menghindari log(0)
        X['log_temperature'] = np.log(X['temperature'] + 1)  # +1 untuk menghindari log(0)
        X['log_flow'] = np.log(X['flow'] + 1)  # +1 untuk menghindari log(0)

        return X


model_path = './XG/dipakeskrng/power/model11feb.dill'
scaler_path = './XG/dipakeskrng/power/scaler.dill'

# Memuat model stacking yang telah disimpan
with open(model_path, 'rb') as model_file:
    model = dill.load(model_file)
    print("Model berhasil dimuat!")

# Memuat imputer dan scaler pipeline yang telah disimpan
with open(scaler_path, 'rb') as pipeline_file:
    imputer, scaler = dill.load(pipeline_file)
    print("Imputer dan Scaler berhasil dimuat!")

# Fungsi untuk menghasilkan data acak
def generate_random_data():
    temperature = random.uniform(160.0, 170.0)
    pressure = random.uniform(6.0, 7.0)
    flow = random.uniform(340.0, 380.0)
    return temperature, pressure, flow

# Membuat pipeline untuk preprocessing data
pipeline = Pipeline(steps=[
    ('feature_engineering', FeatureEngineering()),  # Feature engineering
    ('imputer', imputer),  # Imputasi nilai yang hilang
    ('scaler', scaler)  # Scaling data
])

while True:
    # Menghasilkan data acak
    temperature, pressure, flow = generate_random_data()

    # Membuat DataFrame dari data acak
    new_data = pd.DataFrame([[flow, pressure, temperature]], columns=['flow', 'pressure', 'temperature'])

    # Preprocessing data dengan pipeline
    new_data_processed = pipeline.transform(new_data)

    # Melakukan prediksi dengan model
    predicted_power = model.predict(new_data_processed)
    print(f"Hasil Prediksi Power: {predicted_power[0]}")

    # Menunggu 3 detik sebelum prediksi berikutnya
    time.sleep(3)
