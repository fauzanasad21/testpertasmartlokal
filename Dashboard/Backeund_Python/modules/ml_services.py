import joblib
import dill
import pickle
import json
import pandas as pd
import numpy as np
import CoolProp.CoolProp as CP
from tensorflow.keras.models import load_model
import config

model_gbr = None
scaler_gbr = None
model_twall = None
scaler_twall = None

autoencoder = None
scaler_anomaly = None
config_anomaly = None
FEATURE_NAMES = []
THRESHOLDS_PER_FEATURE = None
SEQ_LENGTH = None
sequence_buffer = []

def create_features_gbr(df):
    X_new = df.copy()
    X_new['P_T'] = X_new['Pressure'] * X_new['Temperature']
    X_new['Twall_flow'] = X_new['Twall'] * X_new['Flow']
    X_new['Pressure_sq'] = X_new['Pressure'] ** 2
    X_new['Temperature_sq'] = X_new['Temperature'] ** 2
    X_new['Log_Pressure'] = np.log1p(X_new['Pressure'])
    X_new['Log_Temperature'] = np.log1p(X_new['Temperature'])
    return X_new

preprocessing_pipeline_prediksi = None
model_pipeline_prediksi = None

def predict_power(base_data):
    global preprocessing_pipeline_prediksi, model_pipeline_prediksi

    # --- Memuat model jika belum ada ---
    if model_pipeline_prediksi is None:
        # ... (kode loading model Anda, tidak perlu diubah) ...
        try:
            print("[INFO] Memuat artefak prediksi daya untuk pertama kali...")
            NAMA_MODEL_PREDIKSI = config.MODEL_PREDICT_POWER_PIPELINE
            NAMA_PREPROCESSING_PREDIKSI = config.PREPROCESSING_PREDICT_POWER_PIPELINE

            with open(NAMA_PREPROCESSING_PREDIKSI, 'rb') as f:
                preprocessing_pipeline_prediksi = dill.load(f)
            with open(NAMA_MODEL_PREDIKSI, 'rb') as f:
                model_pipeline_prediksi = dill.load(f)
            print("[INFO] -> Artefak prediksi daya (pipeline) berhasil dimuat.")
        except Exception as e:
            print(f"[CRITICAL] Gagal memuat artefak prediksi daya. Error: {e}")
            return 0.0

    # --- Proses Prediksi yang Dipisah ---
    input_df = None
    processed_data = None
    
    # BAGIAN A: Pembuatan DataFrame
    try:
        input_df = pd.DataFrame([base_data], columns=['pressure', 'temperature', 'flow'])
    except Exception as e:
        return 0.0

    # BAGIAN B: Transformasi oleh Pipeline
    try:
        processed_data = preprocessing_pipeline_prediksi.transform(input_df)
    except Exception as e:
        return 0.0

    # BAGIAN C: Prediksi oleh Model
    try:
        prediction = model_pipeline_prediksi.predict(processed_data)
        return round(float(prediction[0]), 4)
    except Exception as e:
        return 0.0

def detect_anomaly(data_point):
    """
    Mendeteksi anomali dalam satu titik data.
    Model dimuat sekali saat fungsi pertama kali dijalankan.
    """
    global sequence_buffer, autoencoder, scaler_anomaly, config_anomaly
    global FEATURE_NAMES, THRESHOLDS_PER_FEATURE, SEQ_LENGTH

    # --- Memuat model jika belum ada (hanya sekali) ---
    if autoencoder is None:
        try:
            print("[INFO] Memuat artefak deteksi anomali untuk pertama kali...")
            NAMA_MODEL_ANOMALI = "./model/anomali/model_per_featurev1.1.keras"
            NAMA_SCALER_ANOMALI = "./model/anomali/scaler_per_featurev1.1.pkl"
            NAMA_CONFIG_ANOMALI = "./model/anomali/config_per_featurev1.1.json"
            
            autoencoder = load_model(NAMA_MODEL_ANOMALI)
            scaler_anomaly = joblib.load(NAMA_SCALER_ANOMALI)
            with open(NAMA_CONFIG_ANOMALI, 'r') as f:
                config_anomaly = json.load(f)
            
            FEATURE_NAMES = config_anomaly['features_order']
            THRESHOLDS_PER_FEATURE = np.array(config_anomaly['anomaly_thresholds_per_feature'])
            SEQ_LENGTH = config_anomaly['sequence_length']
            print("[INFO] -> Artefak deteksi anomali berhasil dimuat.")
        except Exception as e:
            print(f"[CRITICAL] Gagal memuat artefak deteksi anomali. Error: {e}")
            return {"detection_status": "Error Loading Model", 
                    "anomalous_features": [], 
                    "errors_per_feature": {}, 
                    "thresholds_per_feature": {}, 
                    "current_values": data_point}

    # --- Proses Deteksi ---
    try:
        values = [data_point.get(f, 0) for f in FEATURE_NAMES]
        sequence_buffer.append(values)
        
        if len(sequence_buffer) > SEQ_LENGTH:
            sequence_buffer.pop(0)
            
        thresholds_dict = {name: float(thresh) for name, thresh in zip(FEATURE_NAMES, THRESHOLDS_PER_FEATURE)}

        if len(sequence_buffer) < SEQ_LENGTH:
            return {"detection_status": "Buffering...", 
                    "anomalous_features": [], 
                    "errors_per_feature": {}, 
                    "thresholds_per_feature": thresholds_dict, 
                    "current_values": data_point}
        
        sequence_np = np.array(sequence_buffer)
        scaled_sequence = scaler_anomaly.transform(sequence_np)
        input_sequence = np.expand_dims(scaled_sequence, axis=0)
        reconstructed = autoencoder.predict(input_sequence, verbose=0)
        
        errors_per_feature = np.mean(np.abs(scaled_sequence - reconstructed[0]), axis=0)
        
        anomalous_features_list = [feature for i, feature in enumerate(FEATURE_NAMES) if errors_per_feature[i] > THRESHOLDS_PER_FEATURE[i]]
        
        status = "Anomali" if anomalous_features_list else "Normal"
        errors_dict = {name: float(err) for name, err in zip(FEATURE_NAMES, errors_per_feature)}
        
        return {"detection_status": status, 
                "anomalous_features": anomalous_features_list, 
                "errors_per_feature": errors_dict, 
                "thresholds_per_feature": thresholds_dict, 
                "current_values": data_point}
        
    except Exception as e:
        print(f"[ERROR] Error saat deteksi anomali: {e}")
        return {"detection_status": "Error", 
                "anomalous_features": [], 
                "errors_per_feature": {}, 
                "thresholds_per_feature": {}, 
                "current_values": data_point}
    
def get_saturation_temperature(pressure, temperature, fluid):

    Tsat = CP.PropsSI('T', 'P', pressure * 1e5, 'Q', 0, fluid) 


    Tsat = Tsat - 273.15
    Delta_Tsat = temperature - Tsat
    return Delta_Tsat

def calculate_dryness(pressure, temperature, flow):
    global model_gbr, scaler_gbr, model_twall, scaler_twall

    # --- Bagian 1: Lazy Loading Artefak (Model & Scaler) ---
    if model_gbr is None:
        try:
            print("[INFO] Memuat artefak Rantai Prediksi Dryness untuk pertama kali...")
            PATH_GBR_MODEL = "D:/Kuliah/GithubLokal/tespertasmartlokal/Model Dryness Maks100/GBR_model.pkl"
            PATH_GBR_SCALER = "D:/Kuliah/GithubLokal/tespertasmartlokal/Model Dryness Maks100/GBR_scaler.pkl"
            PATH_TWALL_MODEL = "D:/Kuliah/GithubLokal/tespertasmartlokal/Model Dryness Maks100/Twall_model.pkl"
            PATH_TWALL_SCALER = "D:/Kuliah/GithubLokal/tespertasmartlokal/Model Dryness Maks100/Twall_scaler.pkl"
            
            # Memuat model & scaler GBR (disimpan dengan pickle)
            with open(PATH_GBR_MODEL, 'rb') as f:
                model_gbr = pickle.load(f)
            with open(PATH_GBR_SCALER, 'rb') as f:
                scaler_gbr = pickle.load(f)

            # Memuat model & scaler Twall (disimpan dengan joblib)
            model_twall = joblib.load(PATH_TWALL_MODEL)
            scaler_twall = joblib.load(PATH_TWALL_SCALER)
            
            print("[INFO] -> Semua artefak Rantai Prediksi Dryness berhasil dimuat.")
        
        except Exception as e:
            print(f"[CRITICAL] Gagal memuat artefak Dryness. Error: {e}")
            return None

    # --- Bagian 2: Proses Rantai Prediksi ---
    try:
        # === LANGKAH 1: Prediksi Twall ===
        twall_input_df = pd.DataFrame([{'Pressure': pressure, 'Temperature': temperature, 'Flow': flow}])
        twall_input_scaled = scaler_twall.transform(twall_input_df)
        predicted_twall = model_twall.predict(twall_input_scaled)[0]

        # === LANGKAH 2: Hitung DeltaTsatTwall ===
        pressure_pa = pressure * 100000
        tsat = CP.PropsSI('T', 'P', pressure_pa, 'Q', 1, 'Water') - 273.15
        calculated_deltat = predicted_twall - tsat

        # === LANGKAH 3: Prediksi Dryness (Final) ===
        gbr_input_df = pd.DataFrame([{
            'Pressure': pressure,
            'Temperature': temperature,
            'Flow': flow,
            'Twall': predicted_twall,
            'DeltaTsatTwall': calculated_deltat
        }])
        
        # Panggil fungsi create_features_gbr
        gbr_engineered = create_features_gbr(gbr_input_df)
        gbr_scaled = scaler_gbr.transform(gbr_engineered)
        final_dryness = model_gbr.predict(gbr_scaled)[0]

        return float(final_dryness)

    except Exception as e:
        print(f"[ERROR] Terjadi kesalahan saat proses prediksi Dryness: {e}")
        return None
    # try:
    #     fluid = 'water'
    #     tsat = get_saturation_temperature(pressure, temperature, fluid)

    #     model = joblib.load('./model/dryness/model_xgboost.joblib')
    #     scaler = joblib.load('./model/dryness/scaler_data.joblib')
    #     feature_names = ['pressure', 'temperature', 'Delta_Tsat']

    #     input_data = pd.DataFrame([[pressure, temperature, tsat]], columns=feature_names)
    #     scaled_data = scaler.transform(input_data)
    #     prediction = model.predict(scaled_data)

    #     return float(prediction)  
    # except Exception as e:
    #     print(f"Error calculating dryness with ML model: {e}")
    #     return None

