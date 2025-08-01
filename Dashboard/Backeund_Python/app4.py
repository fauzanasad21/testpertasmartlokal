import ssl
import json
import time
import threading
import joblib
import os
import pandas as pd
import numpy as np
from flask import Flask, jsonify, render_template, request
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusIOException, ConnectionException
from paho.mqtt import client as mqtt_client
import psycopg2
from psycopg2 import OperationalError
import random
import asyncio
import websockets
from datetime import datetime
import socket
import math
import CoolProp.CoolProp as CP
from perlin_noise import PerlinNoise
import warnings
import dill
from tensorflow.keras.models import load_model

# --- 0. Konfigurasi Awal ---
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

app = Flask(__name__)

# --- 1. Placeholder Global untuk Model & Artefak ---
# Variabel-variabel ini akan diisi saat fungsi prediksi dipanggil pertama kali.
model_dryness = None
scaler_dryness = None

autoencoder = None
scaler_anomaly = None
config_anomaly = None
FEATURE_NAMES = []
THRESHOLDS_PER_FEATURE = None
SEQ_LENGTH = None

preprocessing_pipeline_prediksi = None
model_pipeline_prediksi = None

# --- 2. Konfigurasi & Inisialisasi Global ---
print("[INFO] Menginisialisasi Konfigurasi Global...")

IP = '192.168.3.7'
PORT = 502
SLAVE_ID = 1
ADDRESSPIN1 = 100
SCAN_RATE = 4

AWS_CERT_PATH = './private/5a9e861d1c5ac2e041690d8d21dabdacc3ac9f0f64c5304736d8f7bbc097be87-certificate.pem.crt'
AWS_PRIVATE_KEY_PATH = './private/5a9e861d1c5ac2e041690d8d21dabdacc3ac9f0f64c5304736d8f7bbc097be87-private.pem.key'
AWS_CA_PATH = './private/AmazonRootCA1.pem'
AWS_IOT_ENDPOINT = 'aar9733i1bn73-ats.iot.ap-southeast-1.amazonaws.com'
MQTT_TOPIC_FLOW = 'testingebyte/Flow'
MQTT_TOPIC_TEKANAN = 'testingebyte/Tekanan'
MQTT_TOPIC_TEMPERATUR = 'testingebyte/Temperatur'

failed_db_batch = []
failed_aws_batch = []
db_connection = None
ws_connection = None
DATABASE_CONFIG = {
    'dbname': 'sms',
    'user': 'postgres',
    'password': 'Postgre',
    'host': '127.0.0.1',
    'port': 5432
}

calibration_settings = {
    'temperature': {'min': 0, 'max': 400},
    'flow': {'min': 0, 'max': 500},
    'pressure': {'min': 0, 'max': 10}
}

sequence_buffer = []

# Konfigurasi Perlin Noise untuk simulasi data
p_noise = PerlinNoise(octaves=4, seed=10)
t_noise = PerlinNoise(octaves=4, seed=20)
f_noise = PerlinNoise(octaves=4, seed=30)
time_counter = 0
pressure_min, pressure_max = 6.591, 6.709
temp_min, temp_max = 162.849, 163.134
flow_min, flow_max = 360.1, 360.4


# --- 3. Fungsi-Fungsi Inti (Deteksi Anomali & Prediksi) ---

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
            NAMA_MODEL_PREDIKSI = './XG/modelpredictrobust_pipeline.dill'
            NAMA_PREPROCESSING_PREDIKSI = './XG/preprocessingpredictrobust2_pipeline.dill'

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
            NAMA_MODEL_ANOMALI = "./XG/final_model_per_featurev1.1.keras"
            NAMA_SCALER_ANOMALI = "./XG/final_scaler_per_featurev1.1.pkl"
            NAMA_CONFIG_ANOMALI = "./XG/final_config_per_featurev1.1.json"
            
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

def calculate_dryness(pressure, temperature):
    """
    Menghitung kualitas uap (dryness).
    Model dimuat sekali saat fungsi pertama kali dijalankan.
    """
    global model_dryness, scaler_dryness

    # --- Memuat model jika belum ada (hanya sekali) ---
    if model_dryness is None:
        try:
            print("[INFO] Memuat artefak prediksi dryness untuk pertama kali...")
            model_dryness = joblib.load('./XG/model4des.pkl')
            scaler_dryness = joblib.load('./XG/scaler4des.pkl')
            print("[INFO] -> Artefak prediksi dryness berhasil dimuat.")
        except Exception as e:
            print(f"[CRITICAL] Gagal memuat artefak prediksi dryness. Error: {e}")
            return None # Gagal memuat, kembalikan None

    # --- Proses Kalkulasi & Prediksi ---
    try:
        tsat = get_saturation_temperature(pressure, temperature, 'water')
        feature_names = ['Pressure', 'Temperature', 'Delta_Tsat']
        input_data = pd.DataFrame([[pressure, temperature, tsat]], columns=feature_names)
        scaled_data = scaler_dryness.transform(input_data)
        prediction = model_dryness.predict(scaled_data)
        return float(prediction[0])
    except Exception as e:
        print(f"[ERROR] Error calculating dryness with ML model: {e}")
        return None

# --- 4. Fungsi-Fungsi Utilitas & Konektivitas ---

def init_db():
    """Initialize the database connection and create the table if it doesn't exist."""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS real_time_data (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ NOT NULL,
                flow REAL,
                pressure REAL,
                temperature REAL,
                dryness REAL,
                power_potential REAL,
                anomali_status VARCHAR(50),
                fitur_anomali TEXT
            );
        """)
        conn.commit()
        print("[INFO] Database initialized and Real_Time_Data table checked/created.")
    except OperationalError as e:
        print(f"[ERROR] Error initializing database: {e}")
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

def load_calibration_from_db():
    """Load calibration data from the database and initialize calibration settings."""
    global calibration_settings
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()
        query = "SELECT sensor_type, min_value, max_value FROM public.sensor_calibration ORDER BY sensor_type ASC"
        cursor.execute(query)
        rows = cursor.fetchall()

        for row in rows:
            sensor_type, min_value, max_value = row
            if sensor_type in calibration_settings:
                calibration_settings[sensor_type]['min'] = min_value
                calibration_settings[sensor_type]['max'] = max_value
        print("[INFO] Calibration data loaded from the database successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to load calibration data from database: {e}")
    finally:
        if 'conn' in locals() and not conn.closed:
            cursor.close()
            conn.close()

def connect_mqtt(retries=5, delay=5):
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("[INFO] Connected to AWS IoT Core")
        else:
            print(f"[ERROR] Failed to connect to AWS IoT, return code {rc}")

    def on_disconnect(client, userdata, rc):
        if rc != 0:
            print(f"[WARNING] MQTT disconnected with return code {rc}. Attempting to reconnect...")
    
    client = mqtt_client.Client()
    client.tls_set(
        ca_certs=AWS_CA_PATH, certfile=AWS_CERT_PATH, keyfile=AWS_PRIVATE_KEY_PATH,
        cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS, ciphers=None
    )
    client.tls_insecure_set(False)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    for attempt in range(retries):
        try:
            print(f"[INFO] MQTT Connection Attempt {attempt + 1}/{retries}...")
            client.connect(AWS_IOT_ENDPOINT, port=8883)
            client.loop_start() # Mulai loop di background thread
            print("[INFO] MQTT connection process started.")
            return client
        except Exception as e:
            print(f"[WARNING] MQTT Connection Attempt {attempt + 1} failed: {e}")
            time.sleep(delay)
    print("[ERROR] All attempts to connect to AWS IoT failed.")
    return None

def connect_modbus():
    client = ModbusTcpClient(IP, port=PORT)
    if not client.connect():
        print(f"[ERROR] Failed to connect to Modbus server at {IP}:{PORT}")
        return None
    return client

def get_saturation_temperature(pressure, temperature, fluid):
    Tsat = CP.PropsSI('T', 'P', pressure * 1e5, 'Q', 0, fluid)
    Tsat_C = Tsat - 273.15
    Delta_Tsat = temperature - Tsat_C
    return Delta_Tsat

def read_modbus_data(client, address, num_registers, sensor_names):
    try:
        result = client.read_input_registers(address, num_registers)
        if isinstance(result, ModbusIOException) or result.isError():
            raise Exception(f"Modbus read error at address {address}")

        parsed_data = {}
        for i, sensor_name in enumerate(sensor_names):
            data_signal = result.registers[i] * 1e-3
            min_value = calibration_settings[sensor_name]['min']
            max_value = calibration_settings[sensor_name]['max']
            value = ((data_signal - 4) * (max_value - min_value) / (20 - 4)) + min_value
            parsed_data[sensor_name] = value
        return parsed_data
    except Exception as e:
        print(f"[ERROR] Modbus Read Error: {str(e)}")
        return None

def validate_sensor_data(flow, pressure, temperature):
    return max(0, flow), max(0, pressure), max(0, temperature)

def connect_db():
    global db_connection
    if db_connection is None or db_connection.closed:
        try:
            db_connection = psycopg2.connect(**DATABASE_CONFIG)
            print("[INFO] Successfully reconnected to the database.")
        except OperationalError as e:
            print(f"[ERROR] Failed to connect/reconnect to database: {e}")
            db_connection = None

def send_data_to_aws(client, topic, data):
    try:
        result = client.publish(topic, json.dumps(data), qos=1)
        if result.rc != 0:
            print(f"[WARNING] Failed to publish to {topic}, result code: {result.rc}")
            raise Exception("MQTT publish error")
    except Exception as e:
        print(f"[ERROR] Failed to publish to AWS IoT Core: {e}")
        raise e

async def save_to_database_async(data):
    global db_connection, failed_db_batch
    batch_data = failed_db_batch + [data]
    failed_db_batch = []

    connect_db()

    if db_connection:
        try:
            with db_connection.cursor() as cursor:
                for item in batch_data:
                    # 'fitur_anomali' is now a list. Convert it to a string for the DB.
                    fitur_anomali_list = item['fitur_anomali']
                    # Replicate old logic: comma-separated string, or "-" if list is empty.
                    fitur_anomali_str = ", ".join(fitur_anomali_list) if fitur_anomali_list else "-"
                    cursor.execute('''
                        INSERT INTO real_time_data (timestamp, flow, pressure, temperature, dryness, power_potential, anomali_status, fitur_anomali)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (item['timestamp'], item['flow'], item['pressure'], item['temperature'],
                          item['dryness'], item['power_potential'], item['anomali_status'], fitur_anomali_str))
                db_connection.commit()
        except (OperationalError, psycopg2.InterfaceError) as e:
            print(f"[ERROR] Database error during save: {e}. Batch will be retried.")
            failed_db_batch = batch_data
            db_connection = None # Reset koneksi
        except Exception as e:
            print(f"[ERROR] An unexpected error occurred during DB save: {e}")
            failed_db_batch = batch_data

async def send_to_aws_with_batch(client, data):
    global failed_aws_batch
    batch_data = failed_aws_batch + [data]
    failed_aws_batch = []

    try:
        for item in batch_data:
            send_data_to_aws(client, MQTT_TOPIC_FLOW, {'flow': item['flow']})
            send_data_to_aws(client, MQTT_TOPIC_TEKANAN, {'pressure': item['pressure']})
            send_data_to_aws(client, MQTT_TOPIC_TEMPERATUR, {'temperature': item['temperature']})
            if item.get('dryness') is not None:
                send_data_to_aws(client, 'testingebyte/SteamQuality', {'dryness': item['dryness']})
            if item.get('power_potential') is not None:
                send_data_to_aws(client, 'testingebyte/powerprediction', {'power_potential': item['power_potential']})
            send_data_to_aws(client, 'testingebyte/anomaly', {
                'status': item['anomali_status'],
                'features': item['fitur_anomali']
            })
    except Exception as e:
        print(f"[ERROR] Failed to send batch to AWS IoT, will retry: {e}")
        failed_aws_batch = batch_data

def datetime_converter(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError("Type not serializable")

def map_noise_to_range(noise_val, min_val, max_val):
    return ((noise_val + 0.5) * (max_val - min_val)) + min_val

# --- 5. WebSocket & Worker Utama ---

async def connect_to_node():
    global ws_connection
    uri = "ws://localhost:9923/ws"
    try:
        print(f"[INFO] Attempting to connect to WebSocket at {uri}")
        ws_connection = await websockets.connect(uri)
        print("[INFO] WebSocket connection established with Node.js")
    except Exception as e:
        print(f"[ERROR] Error establishing WebSocket connection: {e}")
        ws_connection = None

async def send_data_to_node(data):
    global ws_connection
    if ws_connection is None:
        await connect_to_node()
        if ws_connection is None:
            print("[WARNING] WebSocket is not connected. Skipping data send.")
            return

    try:
        json_data = json.dumps(data, default=datetime_converter)
        await ws_connection.send(json_data)
    except websockets.exceptions.ConnectionClosed:
        print("[WARNING] Connection was closed. Data not sent. Will reconnect on the next cycle.")
        ws_connection = None
    except Exception as e:
        print(f"[ERROR] An unexpected WebSocket error occurred: {e}")
        ws_connection = None
            
async def main_async_worker():
    global time_counter, failed_aws_batch
    
    print("[INFO] Starting main async worker...")
    mqtt_client = connect_mqtt()
    connect_db()
    
    # modbus_client = connect_modbus() # Uncomment untuk penggunaan Modbus
    # if modbus_client:
    #     print(f"[INFO] Connected to Modbus server at {IP}:{PORT}")

    while True:
        try:
            print(f"--- Worker iteration {time_counter} started ---")
            start_time = time.time()
            timestamp1 = datetime.now()
            timestamp = datetime_converter(timestamp1)

            # --- Langkah 1: Simulasi atau Baca Data Sensor ---
            p_noise_val = p_noise(time_counter * 0.1)
            t_noise_val = t_noise(time_counter * 0.1)
            f_noise_val = f_noise(time_counter * 0.1)
            
            pressure = map_noise_to_range(p_noise_val, pressure_min, pressure_max)
            temperature = map_noise_to_range(t_noise_val, temp_min, temp_max)
            flow = map_noise_to_range(f_noise_val, flow_min, flow_max)

            # --- Langkah 2: Validasi dan Prediksi ---
            flow, pressure, temperature = validate_sensor_data(flow, pressure, temperature)
            
            dryness = calculate_dryness(pressure, temperature)

            base_data_for_power = {'pressure': pressure, 'temperature': temperature, 'flow': flow}
            power_potential = predict_power(base_data_for_power)

            # --- Langkah 3: Deteksi Anomali ---
            data_point_for_anomaly = {
                'pressure': pressure,
                'temperature': temperature,
                'flow': flow,
                'power_potential': power_potential
            }
            anomaly_result = detect_anomaly(data_point_for_anomaly)
            anomali_status = anomaly_result['detection_status']
            fitur_anomali = anomaly_result['anomalous_features']

            print(f"[INFO] Status: {anomali_status}, Fitur Anomali: {', '.join(fitur_anomali) if fitur_anomali else 'N/A'}")

            # --- Langkah 4: Pengumpulan dan Pengiriman Data ---
            data_to_send = {
                'flow': flow,
                'pressure': pressure,
                'temperature': temperature,
                'dryness': dryness,
                'power_potential': power_potential,
                'timestamp': timestamp,
                'anomali_status': anomali_status,
                'fitur_anomali': fitur_anomali
            }
            print(data_to_send);
            
            tasks = [
                send_data_to_node(data_to_send),
                save_to_database_async(data_to_send)
            ]
            
            if mqtt_client and mqtt_client.is_connected():
                tasks.append(send_to_aws_with_batch(mqtt_client, data_to_send))
            else:
                print("[WARNING] MQTT client not connected, skipping AWS send. Data is buffered.")
                failed_aws_batch.append(data_to_send)
                if not mqtt_client or not mqtt_client.is_connected():
                    print("[INFO] Attempting to reconnect MQTT client...")
                    mqtt_client = connect_mqtt()

            await asyncio.gather(*tasks)

        except ConnectionException as e:
            print(f"[ERROR] Modbus Connection Error: {e}. Attempting to reconnect...")
            # modbus_client = connect_modbus() # Uncomment
        except Exception as e:
            print(f"[CRITICAL] An unexpected critical error occurred in the main async worker loop: {e}")

        elapsed_time = time.time() - start_time
        time_counter += 1
        sleep_time = max(0, 1 - elapsed_time)
        print(f"--- Iteration {time_counter-1} finished in {elapsed_time:.2f}s. Sleeping for {sleep_time:.2f}s. ---")
        await asyncio.sleep(sleep_time)

def worker_thread_starter():
    print("[INFO] Starting worker thread.")
    try:
        asyncio.run(main_async_worker())
    except Exception as e:
        print(f"[CRITICAL] Worker thread failed to run asyncio loop: {e}")

# --- 6. Flask Routes & App Start ---

@app.route('/api/receive-calibration', methods=['POST'])
def receive_calibration():
    global calibration_settings
    try:
        calibration_data = request.json
        sensor_type = calibration_data.get('sensor_type')
        min_value = float(calibration_data.get('min_value'))
        max_value = float(calibration_data.get('max_value'))

        if not sensor_type or sensor_type not in calibration_settings:
            print(f"[WARNING] Invalid sensor type received for calibration: {sensor_type}")
            return jsonify({'error': 'Tipe sensor tidak valid'}), 400
        
        calibration_settings[sensor_type]['min'] = min_value
        calibration_settings[sensor_type]['max'] = max_value
        print(f"[INFO] Kalibrasi untuk '{sensor_type}' diperbarui: min={min_value}, max={max_value}")

        # Simpan ke database juga
        conn = psycopg2.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE public.sensor_calibration
            SET min_value = %s, max_value = %s
            WHERE sensor_type = %s;
        """, (min_value, max_value, sensor_type))
        conn.commit()
        cursor.close()
        conn.close()
        print(f"[INFO] Calibration for '{sensor_type}' saved to database.")

        return jsonify({'message': 'Kalibrasi berhasil diterima dan diperbarui'}), 200
    except Exception as e:
        print(f"[ERROR] Error updating calibration: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    print("========================================")
    print("=      Backend Application Starting    =")
    print("========================================")
    
    init_db()
    load_calibration_from_db()
    
    main_worker = threading.Thread(target=worker_thread_starter)
    main_worker.daemon = True
    main_worker.start()
    
    print("[INFO] Starting Flask server on host 0.0.0.0, port 9922")
    # Menonaktifkan logging default Flask agar tidak tumpang tindih
    app.run(host='0.0.0.0', port=9922)