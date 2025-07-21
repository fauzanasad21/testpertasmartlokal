import pandas as pd
import numpy as np
import time

# Fungsi untuk menghitung statistik (min, max, avg, stddev)
def calculate_statistics(df, period):
    return df.resample(period).agg({
        'flow': ['min', 'max', 'mean', 'std'],
        'pressure': ['min', 'max', 'mean', 'std'],
        'temperature': ['min', 'max', 'mean', 'std'],
        'dryness': ['min', 'max', 'mean', 'std'],
        'power_prediction': ['min', 'max', 'mean', 'std']
    })

# Fungsi untuk menyimpan file CSV berdasarkan kategori dan menambahkan id
def save_csv_with_id(df, category, filename):
    df_to_save = df[['timestamp', f'{category}_min', f'{category}_max', f'{category}_mean', f'{category}_std', 'period_type']]
    df_to_save.columns = ['timestamp', 'min_value', 'max_value', 'avg_value', 'stddev_value', 'period_type']
    
    # Menambahkan kolom id
    df_to_save.insert(0, 'id', np.arange(1, len(df_to_save) + 1))

    # Simpan ke file CSV
    df_to_save.to_csv(filename, index=False)

# Membaca data dari CSV
data = pd.read_csv('real_time_data.csv')

# Mengubah kolom 'timestamp' menjadi format datetime
data['timestamp'] = pd.to_datetime(data['timestamp'])

# Set index ke kolom 'timestamp' untuk resampling
data = data.set_index('timestamp')

# Menghitung statistik harian
daily_stats = calculate_statistics(data, 'D')
daily_stats.columns = [f'{col[0]}_{col[1]}' for col in daily_stats.columns]  # Sesuaikan format kolom
daily_stats['timestamp'] = daily_stats.index.strftime('%Y-%m-%d 00:01')
daily_stats['period_type'] = 'daily'

# Menghitung statistik bulanan
monthly_stats = calculate_statistics(data, 'M')
monthly_stats.columns = [f'{col[0]}_{col[1]}' for col in monthly_stats.columns]  # Sesuaikan format kolom
monthly_stats['timestamp'] = monthly_stats.index.strftime('%Y-%m-01 00:01')
monthly_stats['period_type'] = 'monthly'

# Menghitung statistik tahunan
yearly_stats = calculate_statistics(data, 'Y')
yearly_stats.columns = [f'{col[0]}_{col[1]}' for col in yearly_stats.columns]  # Sesuaikan format kolom
yearly_stats['timestamp'] = yearly_stats.index.strftime('%Y-01-01 00:01')
yearly_stats['period_type'] = 'yearly'

# Gabungkan data harian, bulanan, dan tahunan
all_stats = pd.concat([daily_stats, monthly_stats, yearly_stats])

# Daftar kategori yang akan dihitung dan disimpan
categories = ['flow', 'pressure', 'temperature', 'dryness', 'power_prediction']

# Total proses kategori
total_categories = len(categories)
counter = 0

# Menyimpan hasil dalam CSV
for category in categories:
    counter += 1
    print(f"Sedang memproses kategori {category}...")

    # Menyimpan data untuk setiap kategori dalam satu file CSV
    save_csv_with_id(all_stats, category, f'{category}_statistics.csv')

    # Menghitung dan menampilkan persentase progres
    progress = (counter / total_categories) * 100
    print(f"Proses {category} selesai. {progress:.2f}% selesai.")

    # Sleep untuk memberikan jeda dan visualisasi progres (bisa dihapus jika tidak diperlukan)
    time.sleep(1)

print("Semua proses selesai, file CSV sudah dibuat.")
