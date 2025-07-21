import joblib
import numpy as np
import pandas as pd
import CoolProp.CoolProp as CP
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

model_twall_path = './XG/dipakeskrng/dryness/svr_model_twall.pkl'
scaler_twall_path = './XG/dipakeskrng/dryness/scaler_twall.pkl'


modeltwall = joblib.load(model_twall_path)
scalertwall = joblib.load(scaler_twall_path)

# Feature names sesuai dengan yang digunakan dalam model
feature_names_twall = ['Pressure (BarA)', 'Temperature', 'Dryness']

def test_modeltwall(pressure, temperature, dryness):
    """
    Fungsi untuk melakukan prediksi berdasarkan input.
    """
    # Menyusun data input sesuai dengan feature names
    input_data = pd.DataFrame([[pressure, temperature, dryness]], columns=feature_names_twall)
    
    # Scaling data input menggunakan scaler
    scaled_data = scalertwall.transform(input_data)
    
    # Melakukan prediksi menggunakan model
    prediction = modeltwall.predict(scaled_data)
    
    return prediction




# Contoh penggunaan
pressure = 6.05  # Tekanan dalam bar (misalnya 6.3 bar)
temperature = 162.3  # Suhu dalam Celcius
dryness = 100.4
flow = 335.51





# Melakukan prediksi dengan data input
twall = test_modeltwall(pressure, temperature, dryness)
print("Prediction twall:", twall)

# Contoh penggunaan




