import ssl
import json
import time
import threading
import sqlite3
import joblib
import os
import pandas as pd
import numpy as np
from flask import Flask, jsonify, render_template, request
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusIOException
from pymodbus.exceptions import ConnectionException
from paho.mqtt import client as mqtt_client
import CoolProp.CoolProp as CP
import psycopg2
from psycopg2 import OperationalError, sql
from sklearn.preprocessing import MinMaxScaler
import xgboost as xgb
import pickle
import random
import requests
import asyncio
import websockets
from datetime import datetime
import socket 


app = Flask(__name__)

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

rf_model = joblib.load('XG/random_forest_model.joblib')
scaler = joblib.load('XG/scaler_RF.joblib')

IP = '192.168.3.7'
PORT = 502
SLAVE_ID = 1
ADDRESSPIN1 = 100  
ADDRESSPIN2 = 101  
ADDRESSPIN3 = 102  
ADDRESSPIN4 = 260
QUANTITY = 1
SCAN_RATE = 4 

ws_connection = None

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

DATABASE_CONFIG = {
    'dbname': 'smart_monitoring_server',
    'user': 'postgres',
    'password': 's2A#7C>E:>kwETm?',
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



def connect_mqtt(retries=5, delay=5):
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("Connected to AWS IoT Core")
        else:
            print(f"Failed to connect, return code {rc}")

    client = mqtt_client.Client()
    client.tls_set(ca_certs=AWS_CA_PATH,
                   certfile=AWS_CERT_PATH,
                   keyfile=AWS_PRIVATE_KEY_PATH,
                   cert_reqs=ssl.CERT_REQUIRED,
                   tls_version=ssl.PROTOCOL_TLS,
                   ciphers=None)
    client.tls_insecure_set(False)
    client.on_connect = on_connect
    
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

def configure_output_mode_to_4_20ma(client):
    """
    Mengatur mode output AO ke 4-20 mA.
    """
    try:
        result = client.write_register(0x0514, 0x0001, unit=SLAVE_ID)
        if result.isError():
            print("Gagal mengatur mode output AO ke 4-20 mA")
        else:
            print("Mode output AO diatur ke 4-20 mA")
    except Exception as e:
        print(f"Error setting AO output mode: {e}")

# Steam quality calculation
def calculate_dryness(pressure, temperature):
    pressure_pa = pressure * 1e5  
    temperature_k = temperature + 273.15

    if not (611.655 <= pressure_pa <= 2.2064e7):
        print(f"Pressure {pressure_pa} Pa is out of valid range for dryness calculation.")
        return None

    try:
        hf1 = CP.PropsSI('H', 'P', pressure_pa, 'Q', 0, 'Water')
        hfg1 = CP.PropsSI('H', 'P', pressure_pa, 'Q', 1, 'Water') - hf1
        h1 = CP.PropsSI('H', 'P', pressure_pa, 'T', temperature_k, 'Water')
        x = ((h1 - hf1) / hfg1) * 100
    except Exception as e:
        print(f"Error calculating dryness: {e}")
        return None   

    return x

def read_modbus_data(client, address, num_registers, sensor_names):
    """
    Membaca data Modbus dari beberapa register dan mengembalikan nilai yang sudah diparsing.

    :param client: ModbusTcpClient
    :param address: int, alamat register pertama yang akan dibaca
    :param num_registers: int, jumlah register yang akan dibaca
    :param sensor_names: list, nama sensor sesuai urutan register
    :return: dict, hasil parsing data yang dipetakan ke nama sensor
    """
    try:
        # Baca beberapa register sekaligus
        result = client.read_input_registers(address, num_registers)
        if isinstance(result, ModbusIOException) or result.isError():
            raise Exception(f"Modbus read error at address {address} for sensors {sensor_names}")

        parsed_data = {}
        for i, sensor_name in enumerate(sensor_names):
            # Ambil nilai register dan kalibrasi
            data_signal = result.registers[i] * 1e-3
            min_value = calibration_settings[sensor_name]['min']
            max_value = calibration_settings[sensor_name]['max']

            # Kalkulasi nilai aktual berdasarkan rentang kalibrasi
            value = ((data_signal - 4) * (max_value - min_value) / (20 - 4)) + min_value
            parsed_data[sensor_name] = value

            print(f"{sensor_name} at address {address + i}: {value}")

        return parsed_data

    except Exception as e:
        print(f"Read Error: {str(e)}")
        return None

async def send_dryness_to_modbus_async(client, dryness_value, address=100):
    """
    Fungsi asinkron untuk mengirim nilai dryness ke Modbus dalam rentang 4-20 mA.
    
    Parameters:
        client (ModbusTcpClient): Client Modbus yang terhubung.
        dryness_value (float): Nilai dryness yang akan dikirim dalam rentang 4-20 mA.
        address (int): Alamat Modbus untuk menulis nilai dryness.
    """
    loop = asyncio.get_event_loop()
    try:
        # Eksekusi fungsi sinkron dalam thread lain
        await loop.run_in_executor(None, send_dryness_to_modbus, client, dryness_value, address)
    except Exception as e:
        print(f"Error in async Modbus dryness send: {e}")

def send_dryness_to_modbus(client, dryness_value, address=100):
    """
    Mengirim nilai dryness ke alamat Modbus yang ditentukan dalam rentang 4-20 mA.
    
    Parameters:
        client (ModbusTcpClient): Client Modbus yang terhubung.
        dryness_value (float): Nilai dryness yang akan dikirim.
        address (int): Alamat Modbus untuk menulis nilai dryness.
    """
    try:
        if dryness_value < 0 :
            dryness_value = 0
        scaled_dryness = int((dryness_value / 105) * 16000 + 4000)  # 4-20 mA di μA
        result = client.write_register(address, scaled_dryness)
        
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
                return client  # Kembalikan client yang terkoneksi
            else:
                raise ConnectionException("Failed to reconnect to Modbus server")
        except Exception as e:
            print(f"Error reconnecting Modbus: {str(e)}")
            time.sleep(5)  # Tunggu 5 detik sebelum mencoba reconnect lagi

# Callback saat MQTT terputus, untuk reconnect otomatis
def on_disconnect(client, userdata, rc):
    print(f"MQTT disconnected with return code {rc}. Attempting to reconnect...")
    while True:
        try:
            client.reconnect()  # Mencoba reconnect ke MQTT
            print("Reconnected to MQTT")
            break
        except Exception as e:
            print(f"Failed to reconnect to MQTT: {e}")
            time.sleep(5)  # Tunggu 5 detik sebelum mencoba reconnect lagi

# Konsep Baru

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

def send_data_to_mqtt(mqtt_client, flow, pressure, temperature, dryness, power_prediction):
    try:
        send_data_to_aws(mqtt_client, MQTT_TOPIC_FLOW, {'flow': flow})
        send_data_to_aws(mqtt_client, MQTT_TOPIC_TEKANAN, {'pressure': pressure})
        send_data_to_aws(mqtt_client, MQTT_TOPIC_TEMPERATUR, {'temperature': temperature})
        if dryness is not None:
            send_data_to_aws(mqtt_client, 'testingebyte/SteamQuality', {'dryness': dryness})
        if power_prediction is not None:
            send_data_to_aws(mqtt_client, 'testingebyte/powerprediction', {'power_prediction': power_prediction})
    except Exception as e:
        print(f"Failed to publish MQTT message: {e}")

async def save_to_database_async(data):
    """Asynchronous database save with retry mechanism."""
    global db_connection, failed_db_batch
    batch_data = failed_db_batch + [data]  # Gabungkan data baru dengan batch yang gagal sebelumnya

    if db_connection is None :
        connect_db()  # Reconnect jika koneksi ke database hilang

    try:
        cursor = db_connection.cursor()
        for item in batch_data:
            cursor.execute('''
                INSERT INTO real_time_data (timestamp, flow, pressure, temperature, dryness, power_potential)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (item['timestamp'], item['flow'], item['pressure'], item['temperature'],
                  item['dryness'], item['power_prediction']))
        db_connection.commit()
        print("Data batch saved to database.")
        failed_db_batch = []  # Clear batch jika berhasil
    except OperationalError as e:
        print(f"Database error: {e}")
        failed_db_batch = batch_data  # Simpan ulang batch jika gagal
    finally:
        if db_connection :
            cursor.close()

async def send_to_aws_with_batch(client, data):
    """Mengirim data ke AWS dengan penanganan batch jika terjadi kegagalan."""
    global failed_aws_batch
    batch_data = failed_aws_batch + [data]  # Tambahkan data baru ke batch

    try:
        # Coba kirim batch data ke AWS
        for item in batch_data:
            send_data_to_mqtt(client, item['flow'], item['pressure'], item['temperature'],
                              item['dryness'], item['power_prediction'])
        
        # Jika berhasil, kosongkan batch
        failed_aws_batch = []
    except Exception as e:
        print(f"Failed to send to AWS IoT: {e}")
        # Jika gagal, gunakan hanya data terbaru di batch
        failed_aws_batch = [data]

def modbus_worker():
    mqtt_client = connect_mqtt()
    mqtt_client.on_disconnect = on_disconnect

    connect_db()

    # modbus_client = reconnect_modbus()
    # if modbus_client is None or not modbus_client.is_socket_open():
    #     print(f"Connection Error: Could not connect to Modbus server at {IP}:{PORT}")
    #     return

    # configure_output_mode_to_4_20ma(modbus_client)

    print(f"Connected to Modbus server at {IP}:{PORT}")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    while True:
        try:
            start_time = time.time()

            # Baca data Modbus menggunakan fungsi baru
            # sensor_names = ['flow', 'pressure', 'temperature']
            # modbus_data = read_modbus_data(modbus_client, ADDRESSPIN1, 3, sensor_names)

            # if modbus_data is None:
            #     raise ConnectionException("Modbus read error")

            # Ambil data flow, pressure, dan temperature
            # flow = modbus_data['flow']
            # pressure = modbus_data['pressure']
            # temperature = modbus_data['temperature']
            # timestamp = datetime.now()

            flow = random.uniform(46.269, 417.986)
            pressure = random.uniform(5.491, 7.509)
            temperature = random.uniform(162.949, 172.534)
            timestamp = datetime.now()

            # Validasi dan Prediksi
            flow, pressure, temperature = validate_sensor_data(flow, pressure, temperature)
            dryness = calculate_dryness(pressure, temperature) if pressure and temperature else None
            input_data = pd.DataFrame([[pressure, temperature, flow]], columns=['PRESSURE', 'TEMPERATURE', 'FLOW'])
            input_data = input_data.astype(np.float64)
            scaled_input = scaler.transform(input_data)
            scaled_input_df = pd.DataFrame(scaled_input, columns=['PRESSURE', 'TEMPERATURE', 'FLOW'])
            power_prediction = float(rf_model.predict(scaled_input_df)[0])

            # Buat data dictionary untuk dikirim
            data = {
                'flow': flow,
                'pressure': pressure,
                'temperature': temperature,
                'dryness': dryness,
                'power_prediction': power_prediction,
                'timestamp': timestamp
            }

            # Pengiriman data secara paralel
            tasks = [
                send_data_to_node(flow, pressure, temperature, dryness, power_prediction),
                save_to_database_async(data),
                send_to_aws_with_batch(mqtt_client, data)
            ]
            
            # Tambahkan pengiriman dryness ke Modbus jika tersedia
            # if dryness is not None:
            #     tasks.append(send_dryness_to_modbus_async(modbus_client, dryness))

            # Jalankan semua tugas secara paralel
            loop.run_until_complete(asyncio.gather(*tasks))

        except ConnectionException as e:
            print(f"Modbus connection error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

        elapsed_time = time.time() - start_time
        sleep_time = max(0, 1 - elapsed_time)
        time.sleep(sleep_time)

async def connect_to_node():
    global ws_connection
    uri = "ws://localhost:9921"
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
            if ws_connection and ws_connection.open:
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

async def send_data_to_node(flow, pressure, temperature, dryness, power_prediction):
    global ws_connection
    data = {
        'flow': flow,
        'pressure': pressure,
        'temperature': temperature,
        'dryness': dryness,
        'power_prediction': power_prediction
    }
    
    try:
        if ws_connection is None or ws_connection.closed:
            print("Reconnecting to WebSocket...")
            await reconnect_to_node()
        if ws_connection.open:
            await ws_connection.send(json.dumps(data))
            response = await ws_connection.recv()
            print(f"Response from Node.js: {response}")
        else:
            print("WebSocket connection is closed.")
    
    except Exception as e:
        print(f"Error sending data through WebSocket: {e}")


modbus_thread = threading.Thread(target=modbus_worker)
modbus_thread.daemon = True
modbus_thread.start()

@app.route('http://localhost:9921/api/receive-calibration', methods=['POST'])
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

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=9922)
