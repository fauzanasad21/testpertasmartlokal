import ssl
import json
import time
from paho.mqtt import client as mqtt_client
import config # Impor konfigurasi
import socket

failed_aws_batch = []

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
        ca_certs=config.AWS_CA_PATH,
        certfile=config.AWS_CERT_PATH,
        keyfile=config.AWS_PRIVATE_KEY_PATH,
        cert_reqs=ssl.CERT_REQUIRED,
        tls_version=ssl.PROTOCOL_TLS,
        ciphers=None,
    )
    client.tls_insecure_set(False)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    for attempt in range(retries):
        try:
            client.connect(config.AWS_IOT_ENDPOINT, port=8883)
            print("MQTT connection established")
            return client
        except socket.gaierror as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(delay)

    print("All attempts to connect to AWS IoT failed.")
    return None

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
        send_data_to_aws(mqtt_client, config.MQTT_TOPIC_FLOW, {'flow': flow})
        send_data_to_aws(mqtt_client, config.MQTT_TOPIC_TEKANAN, {'pressure': pressure})
        send_data_to_aws(mqtt_client, config.MQTT_TOPIC_TEMPERATUR, {'temperature': temperature})
        if dryness is not None:
            send_data_to_aws(mqtt_client, 'testingebyte/SteamQuality', {'dryness': dryness})
        if power_potential is not None:
            send_data_to_aws(mqtt_client, 'testingebyte/powerprediction', {'power_potential': power_potential})
    except Exception as e:
        print(f"Failed to publish MQTT message: {e}")

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