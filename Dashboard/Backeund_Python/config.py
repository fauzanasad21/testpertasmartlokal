# config.py
import os

# Konfigurasi TensorFlow
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Konfigurasi Modbus
IP = '192.168.3.7'
PORT = 502
SLAVE_ID = 1
ADDRESSPIN1 = 100
SCAN_RATE = 4

# Konfigurasi AWS IoT MQTT
AWS_CERT_PATH = './private/5a9e861d1c5ac2e041690d8d21dabdacc3ac9f0f64c5304736d8f7bbc097be87-certificate.pem.crt'
AWS_PRIVATE_KEY_PATH = './private/5a9e861d1c5ac2e041690d8d21dabdacc3ac9f0f64c5304736d8f7bbc097be87-private.pem.key'
AWS_CA_PATH = './private/AmazonRootCA1.pem'
AWS_IOT_ENDPOINT = 'aar9733i1bn73-ats.iot.ap-southeast-1.amazonaws.com'
MQTT_TOPIC_FLOW = 'testingebyte/Flow'
MQTT_TOPIC_TEKANAN = 'testingebyte/Tekanan'
MQTT_TOPIC_TEMPERATUR = 'testingebyte/Temperatur'
MQTT_TOPIC_DRYNESS = 'testingebyte/SteamQuality'
MQTT_TOPIC_POWER = 'testingebyte/powerprediction'

# Konfigurasi Database
DATABASE_CONFIG = {
    'dbname': 'sms',
    'user': 'postgres',
    'password': 'Postgre',
    'host': '127.0.0.1',
    'port': 5432
}

# Konfigurasi Kalibrasi Awal
CALIBRATION_SETTINGS = {
    'temperature': {'min': 0, 'max': 400},
    'flow': {'min': 0, 'max': 500},
    'pressure': {'min': 0, 'max': 10}
}

# Lokasi file model
MODEL_PREDICT_POWER_PIPELINE = './model/power/modelpredictpower.dill'
PREPROCESSING_PREDICT_POWER_PIPELINE = './model/power/preprocessingpredict_pipeline.dill'
MODEL_ANOMALY = "./model/anomali/model_per_featurev1.1.keras"
SCALER_ANOMALY = "./model/anomali/scaler_per_featurev1.1.pkl"
CONFIG_ANOMALY = "./model/anomali/config_per_featurev1.1.json"
MODEL_DRYNESS = './model/dryness/model4des.pkl'
SCALER_DRYNESS = './model/dryness/scaler4des.pkl'

# Konfigurasi WebSocket
WEBSOCKET_URI = "ws://localhost:9923/ws"