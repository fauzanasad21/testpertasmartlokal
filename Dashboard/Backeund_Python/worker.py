# worker.py
import asyncio
import time
from datetime import datetime
from perlin_noise import PerlinNoise

# Impor semua handler dan utilitas
import config
from modules import db_handler, mqtt_handler, modbus_handler, ws_handler, ml_services, utils

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
    mqtt_client = mqtt_handler.connect_mqtt()
    mqtt_client.on_disconnect = mqtt_client.on_disconnect

    db_handler.connect_db()

    # modbus_client = modbus_handler.reconnect_modbus()
    # if modbus_client is None or not modbus_client.is_socket_open():
    #     print(f"Connection Error: Could not connect to Modbus server at {config.IP}:{config.PORT}")
    #     return

    # modbus_handler.configure_output_mode_to_4_20ma(modbus_client)

    # print(f"Connected to Modbus server at {config.IP}:{config.PORT}")


    while True:
        try:
            start_time = time.time()

            # sensor_names = ['flow', 'pressure', 'temperature']
            # modbus_data = modbus_handler.read_modbus_data(modbus_client, ADDRESSPIN1, 3, sensor_names)

            # if modbus_data is None:
            #     raise modbus_handler.ConnectionException("Modbus read error")

            # # # Ambil data flow, pressure, dan temperature
            # flowRaw = modbus_data['flow']
            
            # pressure = modbus_data['pressure']
            # temperature = modbus_data['temperature']
            # flow = utils.calculateFlow(flowRaw, pressure, temperature)

            timestamp1 = datetime.now()
            timestamp = utils.datetime_converter(timestamp1)
            

            p_noise_val = p_noise(time_counter * 0.1)
            t_noise_val = t_noise(time_counter * 0.1)
            f_noise_val = f_noise(time_counter * 0.1)
            pressure = map_noise_to_range(p_noise_val, pressure_min, pressure_max)
            temperature = map_noise_to_range(t_noise_val, temp_min, temp_max)
            flow = map_noise_to_range(f_noise_val, flow_min, flow_max)

            # pressure = random.uniform(6.591, 6.709)
            # temperature = random.uniform(162.849, 163.134)
            # flow = random.uniform(360.1, 360.4)
            # pressure = 7.909
            # temperature = 165.534
            print('data temperature = ', temperature)
            print('data pressure = ', pressure)
            print('data flow = ', flow)

            # Validasi dan Prediksi
            flow, pressure, temperature = utils.validate_sensor_data(flow, pressure, temperature)
            dryness = ml_services.calculate_dryness(pressure, temperature, flow) 
            
            if dryness > 100:
                dryness = dryness - 0.5

            base_data_for_power = {'pressure': pressure, 'temperature': temperature, 'flow': flow}
            power_potential = ml_services.predict_power(base_data_for_power)

            data_point_for_anomaly = {
                'pressure': pressure,
                'temperature': temperature,
                'flow': flow,
                'power_potential': power_potential
            }
            anomaly_result = ml_services.detect_anomaly(data_point_for_anomaly)
            anomali_status = anomaly_result['detection_status']
            fitur_anomali = anomaly_result['anomalous_features']

            print(f"[INFO] Status: {anomali_status}, Fitur Anomali: {', '.join(fitur_anomali) if fitur_anomali else 'N/A'}")
            print('dryness = ', dryness)
            #print("power potential = ", power_potential)
            # Buat data dictionary untuk dikirim
            data_anomali = {
                'flow': flow,
                'pressure': pressure,
                'temperature': temperature,
                'dryness': dryness,
                'power_potential': power_potential,
                'timestamp': timestamp,
                'anomali_status': anomali_status,
                'fitur_anomali': fitur_anomali
            }
            data = {
                'flow': flow,
                'pressure': pressure,
                'temperature': temperature,
                'dryness': dryness,
                'power_potential': power_potential,
                'timestamp': timestamp
            }


            # Pengiriman data secara paralel
            tasks = [
                ws_handler.send_data_to_node(data_anomali),
                db_handler.save_to_database_async(data),
                # save_to_database_asadd(data2),
                mqtt_handler.send_to_aws_with_batch(mqtt_client, data)
            ]
            

            
            # # Tambahkan pengiriman dryness ke Modbus jika tersedia
            # if dryness is not None:
            #     tasks.append(send_dryness_to_modbus_async(modbus_client, dryness))

            # Jalankan semua tugas secara paralel
            if mqtt_client:
                 tasks.append(mqtt_handler.send_to_aws_with_batch(mqtt_client, data))

            await asyncio.gather(*tasks)

        except Exception as e:
            print(f"An error occurred in the main async worker loop: {e}")

        elapsed_time = time.time() - start_time
        time_counter += 1
        sleep_time = max(0, 1 - elapsed_time)
        # Gunakan asyncio.sleep BUKAN time.sleep
        await asyncio.sleep(sleep_time)

def run_worker():
    # Fungsi ini sekarang hanya bertanggung jawab untuk memulai loop asyncio
    asyncio.run(main_async_worker())
# Ganti fungsi-fungsi ini di kode Anda