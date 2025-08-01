import joblib
import CoolProp.CoolProp as CP
import pandas as pd
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import time

# Muat model dan scaler yang sudah dilatih
model_dry_path = './XG/dipakeskrng/dryness/GradientBoosting.pkl'
scaler_dry_path = './XG/dipakeskrng/dryness/scaler_GB.pkl'

modeldry = joblib.load(model_dry_path)  # Memuat model Gradient Boosting
scalerdry = joblib.load(scaler_dry_path)  # Memuat scaler

# Fungsi untuk menghitung suhu jenuh berdasarkan tekanan (Tsat)
def get_saturation_temperature(pressure, fluid):
    Tsat = CP.PropsSI('T', 'P', pressure * 1e5, 'Q', 0, fluid)  # Pastikan tekanan dalam satuan Pa
    Tsat = Tsat - 273.15  # Mengonversi dari Kelvin ke Celcius
    return Tsat

# Menentukan feature names yang sesuai dengan model
feature_names_dry = ['Pressure (BarA)', 'Temperature', 'Flow', 'Twall', 'TsatA-Twall']

# Fungsi untuk melakukan prediksi dengan model dan scaler yang sudah dimuat
def test_modeldry(pressure, temperature, flow, twall, delta):
    # Menyusun data input sesuai dengan feature names yang digunakan pada saat pelatihan
    input_data = pd.DataFrame([[pressure, temperature, flow, twall, delta]], columns=feature_names_dry)
    
    # Scaling data input menggunakan scaler yang sudah dimuat
    scaled_data = scalerdry.transform(input_data)
    
    # Melakukan prediksi menggunakan model
    prediction = modeldry.predict(scaled_data)
    
    return prediction

# Fungsi untuk mendapatkan input dan melakukan prediksi secara berulang
def perform_predictions():
    # Input data manual dari pengguna
    print("Masukkan nilai untuk prediksi Dryness:")
    pressure = 6.05  # float(input("Pressure (BarA): "))
    temperature = 162  # float(input("Temperature: "))
    flow = 329  # float(input("Flow: "))
    twall = 160  # float(input("Twall: "))

    # Menghitung Tsat berdasarkan tekanan
    fluid = 'water'
    Tsat = get_saturation_temperature(pressure, fluid)
    delta_calculated = Tsat - twall  # Menghitung delta berdasarkan Tsat dan Twall

    # Menampilkan input dan prediksi
    print("\nInput Data:")
    print(f"Pressure: {pressure} BarA")
    print(f"Temperature: {temperature} °C")
    print(f"Flow: {flow} m3/h")
    print(f"Twall: {twall} °C")
    print(f"Delta (TsatA-Twall): {delta_calculated} °C")

    # Melakukan prediksi dengan data yang dimasukkan
    predicted_dryness = test_modeldry(pressure, temperature, flow, twall, delta_calculated)

    # Menampilkan hasil prediksi
    print("\nPrediksi Dryness:")
    print(f"Predicted Dryness: {predicted_dryness[0]}")



# Fungsi utama untuk prediksi berulang setiap 3 detik
def main():
    while True:
        perform_predictions()  # Memanggil fungsi untuk melakukan prediksi
        print("\nMenunggu 3 detik untuk prediksi berikutnya...")
        time.sleep(3)  # Menunggu selama 3 detik sebelum melakukan prediksi berikutnya

# Memulai prediksi berulang
if __name__ == "__main__":
    main()
