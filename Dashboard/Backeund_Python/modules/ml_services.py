import joblib
import dill
import json
import pandas as pd
import numpy as np
import CoolProp.CoolProp as CP
from tensorflow.keras.models import load_model
import config

model_dryness = None
scaler_dryness = None

autoencoder = None
scaler_anomaly = None
config_anomaly = None
FEATURE_NAMES = []
THRESHOLDS_PER_FEATURE = None
SEQ_LENGTH = None
sequence_buffer = []

preprocessing_pipeline_prediksi = None
model_pipeline_prediksi = None



def predict_power(base_data):
    """
    Memprediksi potensi daya (power_potential) dari data sensor.
    Model dimuat sekali saat fungsi pertama kali dijalankan.
    """
    global preprocessing_pipeline_prediksi, model_pipeline_prediksi
    # --- Memuat model jika belum ada (hanya sekali) ---
    if model_pipeline_prediksi is None:
        try:
            print("[INFO] Memuat artefak prediksi daya untuk pertama kali...")
            NAMA_MODEL_PREDIKSI = './model/power/modelpredictrobust_pipeline.dill'
            NAMA_PREPROCESSING_PREDIKSI = './model/power/preprocessingpredictrobust2_pipeline.dill'

            with open(NAMA_PREPROCESSING_PREDIKSI, 'rb') as f:
                preprocessing_pipeline_prediksi = dill.load(f)
            with open(NAMA_MODEL_PREDIKSI, 'rb') as f:
                model_pipeline_prediksi = dill.load(f)
            print("[INFO] -> Artefak prediksi daya (pipeline) berhasil dimuat.")
        except Exception as e:
            print(f"[CRITICAL] Gagal memuat artefak prediksi daya. Error: {e}")
            return 0.0 # Gagal memuat model, kembalikan nilai default

    # --- Proses Prediksi ---
    try:
        input_df = pd.DataFrame([base_data], columns=['pressure', 'temperature', 'flow'])
        processed_data = preprocessing_pipeline_prediksi.transform(input_df)
        prediction = model_pipeline_prediksi.predict(processed_data)
        return round(float(prediction[0]), 4)
    except Exception as e:
        print(f"[ERROR] Error saat prediksi daya: {e}")
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

def calculate_dryness(pressure, temperature):
    try:
        fluid = 'water'
        tsat = get_saturation_temperature(pressure, temperature, fluid)

        model = joblib.load('./model/dryness/model_xgboost.joblib')
        scaler = joblib.load('./model/dryness/scaler_data.joblib')

        feature_names = ['pressure', 'temperature', 'Delta_Tsat']

        input_data = pd.DataFrame([[pressure, temperature, tsat]], columns=feature_names)
        scaled_data = scaler.transform(input_data)
        prediction = model.predict(scaled_data)


        return float(prediction)  
    except Exception as e:
        print(f"Error calculating dryness with ML model: {e}")
        return None