# print("--- Loading app.py ---")
# import threading
# from flask import Flask, jsonify, request
# import config
# from modules import db_handler # Hanya impor modul yang relevan untuk API

# app = Flask(__name__)

# # Inisialisasi data kalibrasi saat startup
# config.CALIBRATION_SETTINGS
# db_handler.init_db()
# db_handler.load_calibration_from_db()


# @app.route('/api/receive-calibration', methods=['POST'])
# def receive_calibration():
#     calibration_data = request.json
#     sensor_type = calibration_data.get('sensor_type')
#     min_value = calibration_data.get('min_value')
#     max_value = calibration_data.get('max_value')

#     if not sensor_type or min_value is None or max_value is None:
#         return jsonify({'error': 'Data kalibrasi tidak lengkap'}), 400

#     if sensor_type in calibration_settings:
#         calibration_settings[sensor_type]['min'] = min_value
#         calibration_settings[sensor_type]['max'] = max_value
#         print(f"Kalibrasi {sensor_type} diperbarui: min={min_value}, max={max_value}")
#         return jsonify({'message': 'Kalibrasi berhasil diterima dan diperbarui'}), 200
#     else:
#         return jsonify({'error': 'Tipe sensor tidak valid'}), 400
    
# if __name__ == "__main__":
#     # Impor worker di sini agar tidak terjadi circular import
#     import worker
    
#     print("Memulai background worker thread...")
#     # Jalankan worker di thread terpisah
#     worker_thread = threading.Thread(target=worker.run_worker)
#     worker_thread.daemon = True
#     worker_thread.start()
    
#     print("Menjalankan Flask App...")
#     # Jalankan server Flask
#     app.run(host='0.0.0.0', port=9922)



print("--- Loading app.py ---")
import threading
from flask import Flask, jsonify, request
import config
from modules import db_handler 
# 1. Impor fungsi yang benar dari ml_services.py
from modules.ml_services import calculate_dryness

app = Flask(__name__)

# Inisialisasi data kalibrasi saat startup
config.CALIBRATION_SETTINGS
db_handler.init_db()
db_handler.load_calibration_from_db()


# Endpoint kalibrasi
@app.route('/api/receive-calibration', methods=['POST'])
def receive_calibration():
    calibration_data = request.json
    sensor_type = calibration_data.get('sensor_type')
    min_value = calibration_data.get('min_value')
    max_value = calibration_data.get('max_value')

    if not sensor_type or min_value is None or max_value is None:
        return jsonify({'error': 'Data kalibrasi tidak lengkap'}), 400

    # Pastikan menggunakan config.CALIBRATION_SETTINGS
    if sensor_type in config.CALIBRATION_SETTINGS:
        config.CALIBRATION_SETTINGS[sensor_type]['min'] = min_value
        config.CALIBRATION_SETTINGS[sensor_type]['max'] = max_value
        print(f"Kalibrasi {sensor_type} diperbarui: min={min_value}, max={max_value}")
        return jsonify({'message': 'Kalibrasi berhasil diterima dan diperbarui'}), 200
    else:
        return jsonify({'error': 'Tipe sensor tidak valid'}), 400

# Endpoint baru untuk menerima data dari Node.js dan memberikan prediksi
@app.route('/predict', methods=['POST'])
def handle_prediction():
    try:
        input_data = request.get_json()
        
        temperature = input_data['temperature']
        pressure = input_data['pressure']
        flow = input_data['flow']

        # 2. Panggil fungsi calculate_dryness
        prediction_result = calculate_dryness(pressure, temperature, flow)

        if prediction_result is not None:
            # Kirim kembali hasil prediksi dalam format JSON
            return jsonify({'predicted_dryness': prediction_result})
        else:
            return jsonify({'error': 'Prediction failed'}), 500

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({'error': str(e)}), 500
    
if __name__ == "__main__":
    import worker
    
    print("Memulai background worker thread...")
    # Jalankan worker di thread terpisah 
    worker_thread = threading.Thread(target=worker.run_worker)
    worker_thread.daemon = True
    worker_thread.start()
    
    print("Menjalankan Flask App...")
    # 3. Jalankan server Flask di port 5000 agar tidak bentrok
    app.run(host='0.0.0.0', port=5000)