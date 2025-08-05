print("--- Loading app.py ---")
import threading
from flask import Flask, jsonify, request
import config
from modules import db_handler # Hanya impor modul yang relevan untuk API

app = Flask(__name__)

# Inisialisasi data kalibrasi saat startup
config.CALIBRATION_SETTINGS
db_handler.init_db()
db_handler.load_calibration_from_db()


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
    
if __name__ == "__main__":
    # Impor worker di sini agar tidak terjadi circular import
    import worker
    
    print("Memulai background worker thread...")
    # Jalankan worker di thread terpisah
    worker_thread = threading.Thread(target=worker.run_worker)
    worker_thread.daemon = True
    worker_thread.start()
    
    print("Menjalankan Flask App...")
    # Jalankan server Flask
    app.run(host='0.0.0.0', port=9922)