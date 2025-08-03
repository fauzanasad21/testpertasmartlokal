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
import tensorflow as tf
from tensorflow.keras.models import load_model

app = Flask(__name__)

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

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

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'


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

def init_db():
    """Initialize the database connection and create the table if it doesn't exist."""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        cursor = conn.cursor()
        conn.commit()
        print("Database initialized and Real_Time_Data table created.")
    except OperationalError as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()
init_db()

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
                print(f"Loaded calibration for {sensor_type}: min={min_value}, max={max_value}")
            else:
                print(f"Sensor type '{sensor_type}' in database is not recognized in the application.")

        cursor.close()
        conn.close()
        print("Calibration data loaded from the database successfully.")

    except Exception as e:
        print(f"Failed to load calibration data from database: {e}")

load_calibration_from_db()

def connect_mqtt(retries=5, delay=5):
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("Connected to AWS IoT Core")
        else:
            print(f"Failed to connect, return code {rc}")

    def on_disconnect(client, userdata, rc):
        if rc != 0:  # Jika disconnect terjadi secara tidak normal
            print(f"MQTT disconnected with return code {rc}. Attempting to reconnect...")
            while True:
                try:
                    client.reconnect()
                    print("Reconnected to MQTT broker")
                    break
                except Exception as e:
                    print(f"Reconnect attempt failed: {e}")
                    time.sleep(delay)

    client = mqtt_client.Client()
    client.tls_set(
        ca_certs=AWS_CA_PATH,
        certfile=AWS_CERT_PATH,
        keyfile=AWS_PRIVATE_KEY_PATH,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLS,
        ciphers=None,
    )
    client.tls_insecure_set(False)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    for attempt in range(retries):
        try:
            client.connect(AWS_IOT_ENDPOINT, port=8883)
            print("MQTT connection established")
            return client
        except socket.gaierror as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(delay)

    print("All attempts to connect to AWS IoT failed.")
    return None




def connect_modbus():
    client = ModbusTcpClient(IP, port=PORT)
    if not client.connect():
        print(f"Failed to connect to Modbus server at {IP}:{PORT}")
        return None
    return client

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

def configure_output_mode_to_4_20ma(client):
    """
    Mengatur mode output AO ke 4-20 mA.
    """
    try:
        result = client.write_register(0x0514, 0x0001)
        if result.isError():
            print("Gagal mengatur mode output AO ke 4-20 mA")
        else:
            print("Mode output AO diatur ke 4-20 mA")
    except Exception as e:
        print(f"Error setting AO output mode: {e}")

def get_saturation_temperature(pressure, temperature, fluid):

    Tsat = CP.PropsSI('T', 'P', pressure * 1e5, 'Q', 0, fluid) 


    Tsat = Tsat - 273.15
    Delta_Tsat = temperature - Tsat
    return Delta_Tsat

def calculate_dryness(pressure, temperature):
    try:
        fluid = 'water'
        tsat = get_saturation_temperature(pressure, temperature, fluid)

        model = joblib.load('./model/dryness/model4des.pkl')
        scaler = joblib.load('./model/dryness/scaler4des.pkl')
        feature_names = ['Pressure', 'Temperature', 'Delta_Tsat']

        input_data = pd.DataFrame([[pressure, temperature, tsat]], columns=feature_names)
        scaled_data = scaler.transform(input_data)
        prediction = model.predict(scaled_data)


        return float(prediction)  
    except Exception as e:
        print(f"Error calculating dryness with ML model: {e}")
        return None



def read_modbus_data(client, address, num_registers, sensor_names):
    try:
        # Baca beberapa register sekaligus
        result = client.read_input_registers(address, num_registers)
        if isinstance(result, ModbusIOException) or result.isError():
            raise Exception(f"Modbus read error at address {address} for sensors {sensor_names}")

        parsed_data = {}
        for i, sensor_name in enumerate(sensor_names):
            # Ambil nilai register dan kalibrasi
            data_signal = result.registers[i] * 1e-3
            print(f"data signal {i}  :  {data_signal}")
            min_value = calibration_settings[sensor_name]['min']
            max_value = calibration_settings[sensor_name]['max']
            print(f"min_value {i} : {min_value}")
            print(f"max_value {i} : {max_value}")
            # Kalkulasi nilai aktual berdasarkan rentang kalibrasi
            value = ((data_signal - 4) * (max_value - min_value) / (20 - 4)) + min_value
            parsed_data[sensor_name] = value

            #print(f"{sensor_name} at address {address + i}: {value}")

        return parsed_data

    except Exception as e:
        print(f"Read Error: {str(e)}")
        return None

async def send_dryness_to_modbus_async(client, dryness_value, address=100):
    loop = asyncio.get_event_loop()
    try:
        # Eksekusi fungsi sinkron dalam thread lain
        await loop.run_in_executor(None, send_dryness_to_modbus, client, dryness_value, address)
    except Exception as e:
        print(f"Error in async Modbus dryness send: {e}")

def send_dryness_to_modbus(client, dryness_value, address=100, address1=101):
    try:
        if dryness_value < 0 :
            dryness_value = 0

        scaled_dryness = int(((dryness_value - 95) * (16000  / (105 - 95))) + 4000)

        result = client.write_register(address, scaled_dryness)
        print(f'Data Arus: {scaled_dryness}')
        
        if result.isError():
            print(f"Failed to write dryness value to Modbus at address {hex(address)}")
        else:
            print(f"Dryness value {dryness_value} sent to Modbus address {hex(address)} successfully.")
        

    except Exception as e:
        print(f"Error sending dryness to Modbus: {e}")

def convert_to_column(variable, column_name):
    df = pd.DataFrame({column_name: variable})
    return df

def validate_sensor_data(flow, pressure, temperature):
    flow = max(0, flow)
    pressure = max(0, pressure)
    temperature = max(0, temperature)
    return flow, pressure, temperature

def reconnect_modbus():
    while True:
        try:
            client = ModbusTcpClient(IP, port=PORT) 
            if client.connect():
                print(f"Reconnected to Modbus server at {IP}:{PORT}")
                return client
            else:
                raise ConnectionException("Failed to reconnect to Modbus server")
        except Exception as e:
            print(f"Error reconnecting Modbus: {str(e)}")
            time.sleep(5)

def on_disconnect(client, userdata, rc):
    print(f"MQTT disconnected with return code {rc}. Attempting to reconnect...")
    while True:
        try:
            client.reconnect()
            print("Reconnected to MQTT")
            break
        except Exception as e:
            print(f"Failed to reconnect to MQTT: {e}")
            time.sleep(5)



def connect_db():
    """Establishes a persistent database connection."""
    global db_connection
    try:
        db_connection = psycopg2.connect(**DATABASE_CONFIG)
        print("Connected to the database.")
    except OperationalError as e:
        print(f"Failed to connect to database: {e}")
        db_connection = None


def send_data_to_aws(client, topic, data):
    try:
        result = client.publish(topic, json.dumps(data), qos=1)  
        if result.rc == 0:
            print(f"Data published to {topic}: {data}")
        else:
            print(f"Failed to publish to {topic}, result code: {result.rc}")
    except Exception as e:
        print(f"Failed to publish to AWS IoT Core: {e}")

def send_data_to_mqtt(mqtt_client, flow, pressure, temperature, dryness, power_potential):
    try:
        send_data_to_aws(mqtt_client, MQTT_TOPIC_FLOW, {'flow': flow})
        send_data_to_aws(mqtt_client, MQTT_TOPIC_TEKANAN, {'pressure': pressure})
        send_data_to_aws(mqtt_client, MQTT_TOPIC_TEMPERATUR, {'temperature': temperature})
        if dryness is not None:
            send_data_to_aws(mqtt_client, 'testingebyte/SteamQuality', {'dryness': dryness})
        if power_potential is not None:
            send_data_to_aws(mqtt_client, 'testingebyte/powerprediction', {'power_potential': power_potential})
    except Exception as e:
        print(f"Failed to publish MQTT message: {e}")

async def save_to_database_async(data):
    """Asynchronous database save with retry mechanism."""
    global db_connection, failed_db_batch
    batch_data = failed_db_batch + [data]  

    if db_connection is None :
        connect_db()  

    try:
        cursor = db_connection.cursor()
        for item in batch_data:
            cursor.execute('''
                INSERT INTO real_time_data (timestamp, flow, pressure, temperature, dryness, power_potential, anomali)
                VALUES (%s, %s, %s, %s, %s, %s,)
            ''', (item['timestamp'], item['flow'], item['pressure'], item['temperature'],
                  item['dryness'], item['power_potential']))
        db_connection.commit()
        #print("Data batch saved to database.")
        failed_db_batch = []  # Clear batch jika berhasil
        print('data tersimpan di database')
    except OperationalError as e:
        print(f"Database error: {e}")
        failed_db_batch = batch_data  # Simpan ulang batch jika gagal
    finally:
        if db_connection :
            cursor.close()

#Data si asad
async def save_to_database_asadd(data):
    """Asynchronous database save with retry mechanism."""
    global db_connection, failed_db_batch
    batch_data = failed_db_batch + [data]  

    if db_connection is None :
        connect_db()  

    try:
        cursor = db_connection.cursor()
        for item in batch_data:
            cursor.execute('''
                INSERT INTO data_buat_asad (timestamp, temperature, rawflow, pressure)
                VALUES (%s, %s, %s, %s)
            ''', (item['timestamp'],item['temperature'], item['rawflow'], item['pressure'] ))
        db_connection.commit()
        #print("Data batch saved to database.")
        failed_db_batch = []  # Clear batch jika berhasil
        print('data tersimpan di database asad')
    except OperationalError as e:
        print(f"Database error: {e}")
        failed_db_batch = batch_data  # Simpan ulang batch jika gagal
    finally:
        if db_connection :
            cursor.close()

async def send_to_aws_with_batch(client, data):
    """Mengirim data ke AWS dengan penanganan batch jika terjadi kegagalan."""
    global failed_aws_batch
    batch_data = failed_aws_batch + [data]  

    try:
        for item in batch_data:
            send_data_to_mqtt(client, item['flow'], item['pressure'], item['temperature'],
                              item['dryness'], item['power_potential'])
        
        failed_aws_batch = []
    except Exception as e:
        print(f"Failed to send to AWS IoT: {e}")
        failed_aws_batch = [data]

def calculateFlow(IN1, IN2, IN3):
    # Konstanta dalam formula
    constant1 = 169.2 + 273.15
    constant2 = 6.89 + 0.95
    
    # Formula perhitungan
    result = 420 * math.sqrt(
        (constant1 / (IN3 + 273.15)) * ((IN2 + 0.95) / constant2) * 4 * IN1
    )
    return result

def datetime_converter(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()  # Convert datetime to ISO 8601 string format
    raise TypeError("Type not serializable")


# Buat generator noise untuk setiap sensor. Seed yang berbeda akan menghasilkan pola yang berbeda.
p_noise = PerlinNoise(octaves=4, seed=10)
t_noise = PerlinNoise(octaves=4, seed=20)
f_noise = PerlinNoise(octaves=4, seed=30)

# Variabel untuk melacak "waktu" agar noise terus bergerak
time_counter = 0

# Definisikan rentang nilai Anda
pressure_min, pressure_max = 6.591, 6.709
temp_min, temp_max = 162.849, 163.134
flow_min, flow_max = 360.1, 360.4

def map_noise_to_range(noise_val, min_val, max_val):
    """Mengubah nilai noise (-0.5 s/d 0.5) ke rentang yang diinginkan."""
    return ((noise_val + 0.5) * (max_val - min_val)) + min_val


async def main_async_worker():
    global time_counter 
    mqtt_client = connect_mqtt()
    mqtt_client.on_disconnect = on_disconnect

    connect_db()

    # modbus_client = reconnect_modbus()
    # if modbus_client is None or not modbus_client.is_socket_open():
    #     print(f"Connection Error: Could not connect to Modbus server at {IP}:{PORT}")
    #     return

    # configure_output_mode_to_4_20ma(modbus_client)

    print(f"Connected to Modbus server at {IP}:{PORT}")


    while True:
        try:
            start_time = time.time()

            sensor_names = ['flow', 'pressure', 'temperature']
            # modbus_data = read_modbus_data(modbus_client, ADDRESSPIN1, 3, sensor_names)

            # if modbus_data is None:
            #     raise ConnectionException("Modbus read error")

            # # # Ambil data flow, pressure, dan temperature
            # flowRaw = modbus_data['flow']
            
            # pressure = modbus_data['pressure']
            # temperature = modbus_data['temperature']
            # flow = calculateFlow(flowRaw, pressure, temperature)
            timestamp1 = datetime.now()
            timestamp = datetime_converter(timestamp1)
            

            p_noise_val = p_noise(time_counter * 0.1)
            t_noise_val = t_noise(time_counter * 0.1)
            f_noise_val = f_noise(time_counter * 0.1)
            pressure = map_noise_to_range(p_noise_val, pressure_min, pressure_max)
            temperature = map_noise_to_range(t_noise_val, temp_min, temp_max)
            flow = map_noise_to_range(f_noise_val, flow_min, flow_max)

            flowRaw = random.uniform(0, 0.25)
            # pressure = random.uniform(6.591, 6.709)
            # temperature = random.uniform(162.849, 163.134)
            # flow = random.uniform(360.1, 360.4)
            # pressure = 7.909
            # temperature = 165.534
            print('data temperature = ', temperature)
            print('data pressure = ', pressure)
            print('data flowraw = ', flowRaw)
            print('data flow = ', flow)

            # Validasi dan Prediksi
            flow, pressure, temperature = validate_sensor_data(flow, pressure, temperature)
            dryness = calculate_dryness(pressure, temperature) 
            
            if dryness > 100:
                dryness = 100

            base_data_for_power = {'pressure': pressure, 'temperature': temperature, 'flow': flow}
            power_potential = predict_power(base_data_for_power)

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
            print('dryness = ', dryness)
            #print("power potential = ", power_potential)
            # Buat data dictionary untuk dikirim
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


            # Pengiriman data secara paralel
            tasks = [
                send_data_to_node(data),
                save_to_database_async(data),
                # save_to_database_asadd(data2),
                send_to_aws_with_batch(mqtt_client, data)
            ]
            

            
            # # Tambahkan pengiriman dryness ke Modbus jika tersedia
            # if dryness is not None:
            #     tasks.append(send_dryness_to_modbus_async(modbus_client, dryness))

            # Jalankan semua tugas secara paralel
            if mqtt_client:
                 tasks.append(send_to_aws_with_batch(mqtt_client, data))

            await asyncio.gather(*tasks)

        except Exception as e:
            print(f"An error occurred in the main async worker loop: {e}")

        elapsed_time = time.time() - start_time
        time_counter += 1
        sleep_time = max(0, 1 - elapsed_time)
        # Gunakan asyncio.sleep BUKAN time.sleep
        await asyncio.sleep(sleep_time)

def modbus_worker():
    # Fungsi ini sekarang hanya bertanggung jawab untuk memulai loop asyncio
    asyncio.run(main_async_worker())
# Ganti fungsi-fungsi ini di kode Anda

async def connect_to_node():
    global ws_connection
    uri = "ws://localhost:9923/ws"
    try:
        ws_connection = await websockets.connect(uri)
        print("WebSocket connection established with Node.js")
    except Exception as e:
        print(f"Error establishing WebSocket connection: {e}")

async def reconnect_to_node(retry_limit=5, retry_delay=5):
    global ws_connection
    for attempt in range(1, retry_limit + 1):
        try:
            print(f"Attempting to reconnect... (Attempt {attempt}/{retry_limit})")
            await connect_to_node()
            print("Reconnected to WebSocket successfully.")
            break  
        except Exception as e:
            print(f"Reconnect attempt failed: {e}")
        
        if attempt < retry_limit:
            print(f"Retrying in {retry_delay} seconds...")
            await asyncio.sleep(retry_delay)
        else:
            print("Max retries reached. Could not reconnect to WebSocket.")
            break  

async def send_data_to_node(data):
    global ws_connection
    
    try:
        if ws_connection is None:
            print("Reconnecting to WebSocket...")
            await reconnect_to_node()
        
        # Handling if connection is closed
        try:
            print(f"Sending data to Node.js: {data}")
            json_data = json.dumps(data, default=str)
            await ws_connection.send(json.dumps(json_data))
            response = await ws_connection.recv()
            #print(f"Response from Node.js: {response}")
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection is closed.")
            await reconnect_to_node()
    except Exception as e:
        print(f"Error sending data through WebSocket: {e}")


modbus_thread = threading.Thread(target=modbus_worker)
modbus_thread.daemon = True
modbus_thread.start()

@app.route('/api/receive-calibration', methods=['POST'])
def receive_calibration():
    calibration_data = request.json
    sensor_type = calibration_data.get('sensor_type')
    min_value = calibration_data.get('min_value')
    max_value = calibration_data.get('max_value')

    if not sensor_type or min_value is None or max_value is None:
        return jsonify({'error': 'Data kalibrasi tidak lengkap'}), 400

    if sensor_type in calibration_settings:
        calibration_settings[sensor_type]['min'] = min_value
        calibration_settings[sensor_type]['max'] = max_value
        print(f"Kalibrasi {sensor_type} diperbarui: min={min_value}, max={max_value}")
        return jsonify({'message': 'Kalibrasi berhasil diterima dan diperbarui'}), 200
    else:
        return jsonify({'error': 'Tipe sensor tidak valid'}), 400

@app.route('/api/tesReceive-calibration', methods=['POST'])
def tes():
    calibration_data = request.json
    print('datates = ', calibration_data)
    return jsonify({'message': 'Kalibrasi berhasil diterima dan diperbarui'}), 200
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=9922)
