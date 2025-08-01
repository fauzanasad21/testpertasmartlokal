import joblib
import numpy as np
import pandas as pd
import CoolProp.CoolProp as CP

model_dry_path = './XG/dipakeskrng/dryness/GradientBoosting.pkl'
scaler_dry_path = './XG/dipakeskrng/dryness/scaler_GB.pkl'

modeldry = joblib.load(model_dry_path)
scalerdry = joblib.load(scaler_dry_path)

fluid = 'water'  # Nama fluida

def get_saturation_temperature(pressure, fluid):
    """
    Fungsi untuk menghitung suhu jenuh berdasarkan tekanan (Tsat).
    """
    # Menghitung suhu jenuh berdasarkan tekanan
    Tsat = CP.PropsSI('T', 'P', pressure * 1e5, 'Q', 0, fluid)  # Pastikan tekanan dalam satuan Pa (1 bar = 1e5 Pa)
    print('Tsat = ', Tsat)
    # Mengembalikan hasil dalam Kelvin

    Tsat = Tsat - 273.15
    Delta_Tsat = temperature - Tsat
    print('Delta_Tsat = ', Delta_Tsat)
    return Delta_Tsat


feature_names_dry = ['Pressure (BarA)', 'Temperature', 'Flow', 'Twall', 'TsatA-Twall']
def test_modeldry(pressure, temperature, flow, twall, delta):
    """
    Fungsi untuk melakukan prediksi berdasarkan input.
    """
    # Menyusun data input sesuai dengan feature names
    input_data = pd.DataFrame([[pressure, temperature, flow, twall, delta]], columns=feature_names_dry)
    
    # Menambahkan fitur augmentasi yang digunakan pada saat pelatihan
    input_data['P_T'] = input_data['Pressure (BarA)'] * input_data['Temperature']
    input_data['Twall_flow'] = input_data['Twall'] * input_data['Flow']
    input_data['Pressure_sq'] = input_data['Pressure (BarA)'] ** 2
    input_data['Temperature_sq'] = input_data['Temperature'] ** 2
    input_data['Log_Pressure'] = np.log1p(input_data['Pressure (BarA)'])
    input_data['Log_Temperature'] = np.log1p(input_data['Temperature'])
    
    # Scaling data input menggunakan scaler
    scaled_data = scalerdry.transform(input_data)
    
    # Melakukan prediksi menggunakan model
    prediction = modeldry.predict(scaled_data)
    
    return prediction


pressure = 6  # Tekanan dalam bar (misalnya 6.3 bar)
temperature = 164.5  # Suhu dalam Celcius
dryness = 100
flow = 340
twall = 162.5
Deltatsat = get_saturation_temperature(pressure, fluid)

DeltaTwall = temperature - twall
delta = Deltatsat - DeltaTwall
# Menghitung suhu jenuh (Tsat) berdasarkan tekanan


# Melakukan prediksi dengan data input
drynespredict = test_modeldry(pressure, temperature, flow, twall, delta)
print("Prediction:", drynespredict)