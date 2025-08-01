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
import logging # <-- DITAMBAHKAN
from logging.handlers import RotatingFileHandler # <-- DITAMBAHKAN

# --- 0. Konfigurasi Awal ---

# --- Konfigurasi Logging ---
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
log_file = 'backend_app.log'

# Handler untuk menyimpan log ke file dengan rotasi (maks 5MB, simpan 3 file backup)
file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# Handler untuk menampilkan log di konsol
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(log_formatter)
stream_handler.setLevel(logging.INFO)

# Dapatkan logger utama dan tambahkan handler
logger = logging.getLogger()
logger.setLevel(logging.INFO)
# Hapus handler default jika ada, untuk menghindari duplikasi output
if logger.hasHandlers():
    logger.handlers.clear()
logger.addHandler(file_handler)
logger.addHandler(stream_handler)
# --- Akhir Konfigurasi Logging ---


# Menonaktifkan peringatan pengguna dari sklearn dan mengatur variabel lingkungan TensorFlow
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

app = Flask(__name__)

# --- 1. Muat Semua Artefak ---
logger.info("Memuat semua artefak...")

# --- Artefak untuk Prediksi Kualitas Uap (Dryness) ---
try:
    model_dryness = joblib.load('./XG/model4des.pkl')
    scaler_dryness = joblib.load('./XG/scaler4des.pkl')
    logger.info("-> Artefak prediksi (Dryness) berhasil dimuat.")
except Exception as e:
    logger.critical(f"Gagal memuat artefak prediksi dryness. Aplikasi berhenti. Error: {e}", exc_info=True)
    exit()

# --- Artefak untuk Deteksi Anomali & Prediksi Daya (Model Baru) ---
try:
    # --- Artefak untuk Deteksi Anomali ---
    NAMA_MODEL_ANOMALI = "final_model_per_featurev1.1.keras"
    NAMA_SCALER_ANOMALI = "final_scaler_per_featurev1.1.pkl"
    NAMA_CONFIG_ANOMALI = "final_config_per_featurev1.1.json"
    
    autoencoder = load_model(NAMA_MODEL_ANOMALI)
    scaler_anomaly = joblib.load(NAMA_SCALER_ANOMALI)
    with open(NAMA_CONFIG_ANOMALI, 'r') as f:
        config_anomaly = json.load(f)
    
    FEATURE_NAMES = config_anomaly['features_order']
    THRESHOLDS_PER_FEATURE = np.array(config_anomaly['anomaly_thresholds_per_feature'])
    SEQ_LENGTH = config_anomaly['sequence_length']
    logger.info("-> Artefak deteksi anomali berhasil dimuat.")

    # --- Artefak untuk Prediksi Daya (dari skrip terpisah) ---
    NAMA_MODEL_PREDIKSI = 'modelpredictrobust_pipeline.dill'
    NAMA_PREPROCESSING_PREDIKSI = 'preprocessingpredictrobust2_pipeline.dill'

    with open(NAMA_PREPROCESSING_PREDIKSI, 'rb') as f:
        preprocessing_pipeline_prediksi = dill.load(f)
    with open(NAMA_MODEL_PREDIKSI, 'rb') as f:
        model_pipeline_prediksi = dill.load(f)
    logger.info("-> Artefak prediksi daya (pipeline) berhasil dimuat.")

except Exception as e:
    logger.critical(f"Gagal memuat artefak deteksi anomali atau prediksi daya. Pastikan file model ada. Aplikasi berhenti. Error: {e}", exc_info=True)
    exit()


# --- 2. Konfigurasi & Inisialisasi Global ---
IP = '192.168.3.7'
PORT = 502
SLAVE_ID = 1
ADDRESSPIN1 = 100
SCAN_RATE = 1

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

# Buffer untuk menyimpan urutan data untuk deteksi anomali
sequence_buffer = []

# --- 3. Fungsi-Fungsi Inti (Deteksi Anomali & Prediksi) ---

def predict_power(base_data):
    """
    Fungsi ini mengambil data sensor (pressure, temperature, flow) dan
    memprediksi potensi daya (power_potential) menggunakan model pipeline.
    """
    try:
        input_df = pd.DataFrame([base_data], columns=['pressure', 'temperature', 'flow'])
        processed_data = preprocessing_pipeline_prediksi.transform(input_df)
        prediction = model_pipeline_prediksi.predict(processed_data)
        return round(float(prediction[0]), 4)
    except Exception as e:
        logger.error("Error saat prediksi daya.", exc_info=True)
        return 0.0 # Return nilai default jika error

def detect_anomaly(data_point):
    """
    Fungsi ini mendeteksi anomali dalam satu titik data dan mengembalikan fitur anomali sebagai string.
    """
    global sequence_buffer
    
    try:
        values = [data_point.get(f, 0) for f in FEATURE_NAMES]
        sequence_buffer.append(values)
        
        if len(sequence_buffer) > SEQ_LENGTH:
            sequence_buffer.pop(0)
            
        thresholds_dict = {name: float(thresh) for name, thresh in zip(FEATURE_NAMES, THRESHOLDS_PER_FEATURE)}

        # Handle kasus "Buffering"
        if len(sequence_buffer) < SEQ_LENGTH:
            return {
                "detection_status": "Buffering...",
                "anomalous_features": "-",  # Diubah menjadi string
                "errors_per_feature": {},
                "thresholds_per_feature": thresholds_dict,
                "current_values": data_point
            }
        
        sequence_np = np.array(sequence_buffer)
        scaled_sequence = scaler_anomaly.transform(sequence_np)
        input_sequence = np.expand_dims(scaled_sequence, axis=0)
        reconstructed = autoencoder.predict(input_sequence, verbose=0)
        
        errors_per_feature = np.mean(np.abs(scaled_sequence - reconstructed[0]), axis=0)
        
        anomalous_features_list = [
            feature for i, feature in enumerate(FEATURE_NAMES) 
            if errors_per_feature[i] > THRESHOLDS_PER_FEATURE[i]
        ]
        
        status = "Anomali" if anomalous_features_list else "Normal"
        errors_dict = {name: float(err) for name, err in zip(FEATURE_NAMES, errors_per_feature)}
        
        # --- MODIFIKASI UTAMA: Ubah list fitur anomali menjadi string tunggal ---
        if status == "Anomali":
            # Jika anomali, gabungkan nama fitur menjadi satu string dipisahkan koma
            display_features_string = ", ".join(anomalous_features_list)
        else:
            # Jika Normal, gunakan tanda strip
            display_features_string = "-"
        
        return {
            "detection_status": status,
            "anomalous_features": display_features_string,  # Menggunakan variabel string baru
            "errors_per_feature": errors_dict,
            "thresholds_per_feature": thresholds_dict,
            "current_values": data_point
        }
        
    except Exception as e:
        logger.error("Error saat deteksi anomali.", exc_info=True)
        return { 
            "detection_status": "Error", 
            "anomalous_features": "-", # Juga berikan strip saat error
            "errors_per_feature": {}, 
            "thresholds_per_feature": {}, 
            "current_values": data_point 
        }

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
        logger.info("Database initialized and Real_Time_Data table checked/created.")
    except OperationalError as e:
        logger.error(f"Error initializing database: {e}", exc_info=True)
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
        logger.info("Calibration data loaded from the database successfully.")
    except Exception as e:
        logger.error(f"Failed to load calibration data from database: {e}", exc_info=True)
    finally:
        if 'conn' in locals() and not conn.closed:
            cursor.close()
            conn.close()

def connect_mqtt(retries=5, delay=5):
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to AWS IoT Core")
        else:
            logger.error(f"Failed to connect to AWS IoT, return code {rc}")

    def on_disconnect(client, userdata, rc):
        if rc != 0:
            logger.warning(f"MQTT disconnected with return code {rc}. Attempting to reconnect...")
    
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
            logger.info(f"MQTT Connection Attempt {attempt + 1}/{retries}...")
            client.connect(AWS_IOT_ENDPOINT, port=8883)
            client.loop_start() # Mulai loop di background thread
            logger.info("MQTT connection process started.")
            return client
        except Exception as e:
            logger.warning(f"MQTT Connection Attempt {attempt + 1} failed: {e}")
            time.sleep(delay)
    logger.error("All attempts to connect to AWS IoT failed.")
    return None

def connect_modbus():
    client = ModbusTcpClient(IP, port=PORT)
    if not client.connect():
        logger.error(f"Failed to connect to Modbus server at {IP}:{PORT}")
        return None
    return client

def get_saturation_temperature(pressure, temperature, fluid):
    Tsat = CP.PropsSI('T', 'P', pressure * 1e5, 'Q', 0, fluid)
    Tsat_C = Tsat - 273.15
    Delta_Tsat = temperature - Tsat_C
    return Delta_Tsat

def calculate_dryness(pressure, temperature):
    try:
        tsat = get_saturation_temperature(pressure, temperature, 'water')
        feature_names = ['Pressure', 'Temperature', 'Delta_Tsat']
        input_data = pd.DataFrame([[pressure, temperature, tsat]], columns=feature_names)
        scaled_data = scaler_dryness.transform(input_data)
        prediction = model_dryness.predict(scaled_data)
        return float(prediction[0])
    except Exception as e:
        logger.error(f"Error calculating dryness with ML model: {e}", exc_info=True)
        return None

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
        logger.error(f"Modbus Read Error: {str(e)}", exc_info=True)
        return None

def validate_sensor_data(flow, pressure, temperature):
    return max(0, flow), max(0, pressure), max(0, temperature)

def connect_db():
    global db_connection
    if db_connection is None or db_connection.closed:
        try:
            db_connection = psycopg2.connect(**DATABASE_CONFIG)
            logger.info("Successfully reconnected to the database.")
        except OperationalError as e:
            logger.error(f"Failed to connect/reconnect to database: {e}")
            db_connection = None

def send_data_to_aws(client, topic, data):
    try:
        result = client.publish(topic, json.dumps(data), qos=1)
        if result.rc != 0:
            logger.warning(f"Failed to publish to {topic}, result code: {result.rc}")
            raise Exception("MQTT publish error")
    except Exception as e:
        logger.error(f"Failed to publish to AWS IoT Core: {e}", exc_info=True)
        raise e

async def save_to_database_async(data):
    global db_connection, failed_db_batch
    batch_data = failed_db_batch + [data]
    failed_db_batch = []

    connect_db() # Pastikan koneksi ada

    if db_connection:
        try:
            with db_connection.cursor() as cursor:
                for item in batch_data:
                    fitur_anomali_str = json.dumps(item['fitur_anomali'])
                    cursor.execute('''
                        INSERT INTO real_time_data (timestamp, flow, pressure, temperature, dryness, power_potential, anomali_status, fitur_anomali)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (item['timestamp'], item['flow'], item['pressure'], item['temperature'],
                          item['dryness'], item['power_potential'], item['anomali_status'], fitur_anomali_str))
                db_connection.commit()
                # logger.info(f"Successfully saved batch of {len(batch_data)} items to database.")
        except (OperationalError, psycopg2.InterfaceError) as e:
            logger.error(f"Database error during save: {e}. Batch will be retried.", exc_info=True)
            failed_db_batch = batch_data
            db_connection = None # Reset koneksi
        except Exception as e:
            logger.error(f"An unexpected error occurred during DB save: {e}", exc_info=True)
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
        # logger.info(f"Successfully sent batch of {len(batch_data)} items to AWS IoT.")
    except Exception as e:
        logger.error(f"Failed to send batch to AWS IoT, will retry: {e}", exc_info=True)
        failed_aws_batch = batch_data

def datetime_converter(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError("Type not serializable")

# Konfigurasi Perlin Noise untuk simulasi data
p_noise = PerlinNoise(octaves=4, seed=10)
t_noise = PerlinNoise(octaves=4, seed=20)
f_noise = PerlinNoise(octaves=4, seed=30)
time_counter = 0
pressure_min, pressure_max = 6.591, 6.709
temp_min, temp_max = 162.849, 163.134
flow_min, flow_max = 360.1, 360.4

def map_noise_to_range(noise_val, min_val, max_val):
    return ((noise_val + 0.5) * (max_val - min_val)) + min_val

# --- 5. WebSocket & Worker Utama ---

async def connect_to_node():
    global ws_connection
    uri = "ws://localhost:9923/ws"
    try:
        logger.info(f"Attempting to connect to WebSocket at {uri}")
        ws_connection = await websockets.connect(uri)
        logger.info("WebSocket connection established with Node.js")
    except Exception as e:
        logger.error(f"Error establishing WebSocket connection: {e}", exc_info=True)
        ws_connection = None

async def send_data_to_node(data):
    global ws_connection

    # Langkah 1: Jika koneksi belum ada (pertama kali atau setelah error), coba sambungkan.
    if ws_connection is None:
        await connect_to_node()
        # Jika setelah mencoba tetap tidak ada koneksi, keluar.
        if ws_connection is None:
            logger.warning("WebSocket is not connected. Skipping data send.")
            return

    # Langkah 2: Langsung coba kirim data.
    # Blok try...except akan menangani jika koneksi ternyata sudah terputus.
    try:
        json_data = json.dumps(data, default=datetime_converter)
        await ws_connection.send(json_data)
    except websockets.exceptions.ConnectionClosed:
        logger.warning("Connection was closed. Data not sent. Will reconnect on the next cycle.")
        # Set koneksi ke None agar siklus berikutnya otomatis mencoba menyambung ulang.
        ws_connection = None
    except Exception as e:
        logger.error(f"An unexpected WebSocket error occurred: {e}", exc_info=True)
        # Set koneksi ke None untuk memaksa rekoneksi.
        ws_connection = None
            
async def main_async_worker():
    global time_counter, failed_aws_batch
    
    logger.info("Starting main async worker...")
    mqtt_client = connect_mqtt()
    connect_db()
    
    # modbus_client = connect_modbus() # Uncomment untuk penggunaan Modbus
    # if modbus_client:
    #     logger.info(f"Connected to Modbus server at {IP}:{PORT}")

    while True:
        try:
            logger.info(f"--- Worker iteration {time_counter} started ---")
            start_time = time.time()
            timestamp1 = datetime.now()
            timestamp = datetime_converter(timestamp1)

            # --- Simulasi atau Baca Data Sensor ---
            logger.info("Menghitung Perlin noise untuk pressure...")
            p_noise_val = p_noise(time_counter * 0.1)
            logger.info("Menghitung Perlin noise untuk temperature...")
            t_noise_val = t_noise(time_counter * 0.1)
            logger.info("Menghitung Perlin noise untuk flow...")
            f_noise_val = f_noise(time_counter * 0.1)
            logger.info("Perhitungan Perlin noise selesai. Melakukan mapping range...")
            
            pressure = map_noise_to_range(p_noise_val, pressure_min, pressure_max)
            temperature = map_noise_to_range(t_noise_val, temp_min, temp_max)
            flow = map_noise_to_range(f_noise_val, flow_min, flow_max)
            logger.info("Mapping range selesai.")

            # --- Validasi dan Prediksi ---
            logger.info("Memvalidasi data sensor...")
            flow, pressure, temperature = validate_sensor_data(flow, pressure, temperature)
            
            logger.info("Menghitung dryness...")
            dryness = calculate_dryness(pressure, temperature)
            logger.info(f"Dryness dihitung: {dryness}")

            logger.info("Memprediksi potensi daya...")
            base_data_for_power = {'pressure': pressure, 'temperature': temperature, 'flow': flow}
            power_potential = predict_power(base_data_for_power)
            logger.info(f"Potensi daya diprediksi: {power_potential}")

            # --- DETEKSI ANOMALI ---
            logger.info("Mendeteksi anomali...")
            data_point_for_anomaly = {
                'pressure': pressure,
                'temperature': temperature,
                'flow': flow,
                'power_potential': power_potential
            }
            anomaly_result = detect_anomaly(data_point_for_anomaly)
            logger.info("Deteksi anomali selesai.")

            anomali_status = anomaly_result['detection_status']
            fitur_anomali = anomaly_result['anomalous_features']

            logger.info(f"Status: {anomali_status}, Fitur Anomali: {fitur_anomali if fitur_anomali else 'N/A'}")

            # --- Pengumpulan Data untuk Dikirim ---
            data = {
                'flow': flow,
                'pressure': pressure,
                'temperature': temperature,
                'dryness': dryness,
                'power_potential': power_potential,
                'timestamp': timestamp,
                'anomali_status': anomali_status,
                'fitur_anomali': fitur_anomali
            }
            print(data);
            
            # data2 = {
            #      'rawflow': flowRaw, # Variabel 'flowRaw' tidak terdefinisi
            #      'pressure': pressure,
            #      'temperature': temperature,
            #     'timestamp': timestamp
            #  }
            
            # --- Pengiriman Data ---
            tasks = [
                send_data_to_node(data),
                save_to_database_async(data)
            ]
            if mqtt_client and mqtt_client.is_connected():
                tasks.append(send_to_aws_with_batch(mqtt_client, data))
            else:
                logger.warning("MQTT client not connected, skipping AWS send. Data is buffered.")
                failed_aws_batch.append(data) # Simpan untuk dikirim nanti
                if not mqtt_client or not mqtt_client.is_connected():
                    logger.info("Attempting to reconnect MQTT client...")
                    mqtt_client = connect_mqtt()

            await asyncio.gather(*tasks)

        except ConnectionException as e:
            logger.error(f"Modbus Connection Error: {e}. Attempting to reconnect...", exc_info=True)
            # modbus_client = connect_modbus() # Uncomment
        except Exception as e:
            logger.critical(f"An unexpected critical error occurred in the main async worker loop: {e}", exc_info=True)

        elapsed_time = time.time() - start_time
        time_counter += 1
        sleep_time = max(0, SCAN_RATE - elapsed_time)
        logger.info(f"--- Iteration {time_counter-1} finished in {elapsed_time:.2f}s. Sleeping for {sleep_time:.2f}s. ---")
        await asyncio.sleep(sleep_time)

def worker_thread_starter():
    logger.info("Starting worker thread.")
    try:
        asyncio.run(main_async_worker())
    except Exception as e:
        logger.critical(f"Worker thread failed to run asyncio loop: {e}", exc_info=True)

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
            logger.warning(f"Invalid sensor type received for calibration: {sensor_type}")
            return jsonify({'error': 'Tipe sensor tidak valid'}), 400
        
        calibration_settings[sensor_type]['min'] = min_value
        calibration_settings[sensor_type]['max'] = max_value
        logger.info(f"Kalibrasi untuk '{sensor_type}' diperbarui: min={min_value}, max={max_value}")

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
        logger.info(f"Calibration for '{sensor_type}' saved to database.")

        return jsonify({'message': 'Kalibrasi berhasil diterima dan diperbarui'}), 200
    except Exception as e:
        logger.error(f"Error updating calibration: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    logger.info("========================================")
    logger.info("=      Backend Application Starting    =")
    logger.info("========================================")
    
    init_db()
    load_calibration_from_db()
    
    main_worker = threading.Thread(target=worker_thread_starter)
    main_worker.daemon = True
    main_worker.start()
    
    logger.info("Starting Flask server on host 0.0.0.0, port 9922")
    # Menonaktifkan logging default Flask agar tidak tumpang tindih
    app.run(host='0.0.0.0', port=9922)