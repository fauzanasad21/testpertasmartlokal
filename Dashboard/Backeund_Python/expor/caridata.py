import pandas as pd

# Nama file CSV Anda
csv_file = 'real_time_data.csv'  # Ganti dengan nama file CSV Anda

# Rentang waktu yang akan difilter
start_date = '2024-12-20 00:00:00'
end_date = '2024-12-21 23:59:59'

# Membaca file CSV
try:
    # Pastikan kolom timestamp dalam format datetime
    df = pd.read_csv(csv_file, parse_dates=['timestamp'])  # Pastikan kolom timestamp ada di file CSV

    # Filter data berdasarkan rentang tanggal
    filtered_data = df[(df['timestamp'] >= start_date) & (df['timestamp'] <= end_date)]

    # Menampilkan hasil
    print("Data dalam rentang waktu:")
    print(filtered_data)

    # Menyimpan data yang difilter ke file baru (opsional)
    filtered_data.to_csv('filtered_data.csv', index=False)
    print("\nData berhasil disimpan ke 'filtered_data.csv'")

except FileNotFoundError:
    print(f"File '{csv_file}' tidak ditemukan.")
except KeyError:
    print("Pastikan kolom 'timestamp' ada di file CSV Anda.")
except Exception as e:
    print(f"Terjadi kesalahan: {e}")
