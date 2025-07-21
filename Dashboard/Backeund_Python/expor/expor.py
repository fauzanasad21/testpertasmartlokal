import psycopg2
import csv

# Konfigurasi database
DATABASE_CONFIG = {
    'dbname': 'smart_monitoring_server',
    'user': 'postgres',
    'password': 's2A#7C>E:>kwETm?',
    'host': '0.tcp.ap.ngrok.io',
    'port': 18439
}

# Koneksi ke database
conn = psycopg2.connect(**DATABASE_CONFIG)
cursor = conn.cursor()

# Jalankan query SELECT
cursor.execute("SELECT * FROM sensor_calibration")

# Tuliskan ke file CSV
with open('21ha.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    # Tulis header
    writer.writerow([desc[0] for desc in cursor.description])
    # Tulis data
    writer.writerows(cursor.fetchall())

print("Tabel berhasil diekspor ke 'sensor_calibration_export.csv'")
cursor.close()
conn.close()
