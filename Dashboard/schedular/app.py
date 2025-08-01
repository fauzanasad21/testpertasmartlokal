import mysql.connector
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from scipy.stats import linregress
import schedule
import time
from calendar import monthrange, isleap

# Koneksi ke database MySQL
def connect_db():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="unpad",
        password="@Jatinangor1",
        database="monitoring_steam_dryness"
    )

# Mengambil batasan dari tabel limit_settings
def fetch_limits():
    db = connect_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT data, batasAtas, batasBawah FROM limit_settings")
    limits = cursor.fetchall()
    db.close()
    return {limit['data']: (limit['batasAtas'], limit['batasBawah']) for limit in limits}

# Mengambil data dari tabel real_time_data berdasarkan periode
def fetch_data(period):
    db = connect_db()
    cursor = db.cursor(dictionary=True)
    end_time = datetime.now()
    
    if period == "now":
        start_time = end_time - timedelta(hours=1)
    elif period == "daily":
        start_time = end_time - timedelta(days=1)
    elif period == "monthly":
        start_time = end_time - timedelta(days=30)
    elif period == "yearly":
        start_time = end_time - timedelta(days=365)
    
    query = f"SELECT * FROM real_time_data WHERE timestamp >= '{start_time}'"
    cursor.execute(query)
    data = cursor.fetchall()
    db.close()
    
    return pd.DataFrame(data)

# Fungsi untuk mengambil data berdasarkan periode yang akurat
def fetch_data_periodically(period):
    db = connect_db()
    cursor = db.cursor(dictionary=True)

    # Tentukan waktu akhir periode (awal hari ini pukul 00:00)
    end_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    if period == "daily":
        # Data harian: dari 00:00 kemarin hingga 00:00 hari ini
        start_time = end_time - timedelta(days=1)

    elif period == "monthly":
        # Data bulanan: dari awal bulan sebelumnya hingga akhir bulan sebelumnya
        first_day_current_month = end_time.replace(day=1)
        last_day_previous_month = first_day_current_month - timedelta(days=1)
        start_time = last_day_previous_month.replace(day=1)

    elif period == "yearly":
        # Data tahunan: dari 1 Januari tahun sebelumnya hingga 31 Desember tahun sebelumnya
        start_time = end_time.replace(month=1, day=1, year=end_time.year - 1)
        end_time = end_time.replace(month=1, day=1)  # Awal tahun ini (tidak termasuk)

    # Query SQL dengan parameter keamanan
    query = "SELECT * FROM real_time_data WHERE timestamp >= %s AND timestamp < %s"
    cursor.execute(query, (start_time, end_time))
    data = cursor.fetchall()

    db.close()
    return pd.DataFrame(data)


# Menghitung statistik untuk setiap jenis data
def calculate_stats(data, limits):
    results = {}
    for column in ['flow', 'pressure', 'temperature', 'dryness', 'power_prediction']:
        if column in data:
            values = data[column].dropna()
            
            # Pastikan minimal ada 2 titik data untuk regresi
            if len(values) > 1:
                timestamps = data['timestamp'].view('int64') // 10**9  # Konversi timestamp ke detik epoch
                slope, _, _, _, _ = linregress(timestamps, values)
            else:
                slope = 0.0  # Jika data kurang dari 2 titik

            min_val = values.min()
            max_val = values.max()
            avg_val = values.mean()
            stddev_val = values.std()
            upper_limit, lower_limit = limits[column]
            out_of_limit_count = values[(values > upper_limit) | (values < lower_limit)].count()

            results[column] = {
                'min': min_val,
                'max': max_val,
                'avg': avg_val,
                'stddev': stddev_val,
                'gradient': slope,
                'out_of_limit_count': out_of_limit_count
            }
    return results

# Menyimpan atau memperbarui statistik ke dalam tabel
def save_statistics(data_type, period, stats):
    db = connect_db()
    cursor = db.cursor()

    min_value = float(stats['min']) if stats['min'] is not None else 0.0
    max_value = float(stats['max']) if stats['max'] is not None else 0.0
    avg_value = float(stats['avg']) if stats['avg'] is not None else 0.0
    stddev_value = float(stats['stddev']) if stats['stddev'] is not None else 0.0
    gradient = float(stats['gradient']) if stats['gradient'] is not None else 0.0
    out_of_limit_count = int(stats['out_of_limit_count']) if stats['out_of_limit_count'] is not None else 0

    query = """
    INSERT INTO statistics_summary (data_type, period, min_value, max_value, avg_value, stddev_value, gradient, out_of_limit_count)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        min_value = VALUES(min_value),
        max_value = VALUES(max_value),
        avg_value = VALUES(avg_value),
        stddev_value = VALUES(stddev_value),
        gradient = VALUES(gradient),
        out_of_limit_count = VALUES(out_of_limit_count),
        calculated_at = CURRENT_TIMESTAMP;
    """

    cursor.execute(query, (
        data_type, period, min_value, max_value, avg_value, stddev_value, gradient, out_of_limit_count
    ))
    
    db.commit()
    db.close()

# Fungsi untuk menyimpan statistik periodik
def save_periodic_statistics(data_type, period, stats):
    table_name = f"{data_type}_statistics"  # Nama tabel dinamis berdasarkan data_type

    min_value = float(stats['min']) if stats['min'] is not None else 0.0
    max_value = float(stats['max']) if stats['max'] is not None else 0.0
    avg_value = float(stats['avg']) if stats['avg'] is not None else 0.0
    stddev_value = float(stats['stddev']) if stats['stddev'] is not None else 0.0

    query = f"""
    INSERT INTO {table_name} (timestamp, min_value, max_value, avg_value, stddev_value, period_type)
    VALUES (CURRENT_TIMESTAMP, %s, %s, %s, %s, %s);
    """

    db = connect_db()
    cursor = db.cursor()
    cursor.execute(query, (min_value, max_value, avg_value, stddev_value, period))
    db.commit()
    db.close()


# Fungsi utama untuk mengatur event perhitungan
def handle_event(period):
    limits = fetch_limits()
    data = fetch_data(period)
    results = calculate_stats(data, limits)
    for data_type, stats in results.items():
        save_statistics(data_type, period, stats)
    print(f"Statistics latest for {period} period saved/updated.")

# Handler untuk event periodik (harian, bulanan, tahunan)
def handle_periodic_event(period):
    limits = fetch_limits()
    data = fetch_data_periodically(period) 
    results = calculate_stats(data, limits)
    for data_type, stats in results.items():
        save_periodic_statistics(data_type, period, stats)
    print(f"Periodic statistics for {period} saved.")



# Fungsi untuk memeriksa apakah ini adalah hari pertama bulan/tahun
def check_and_run(period):
    now = datetime.now()

    if period == "monthly" and now.day == 1:
        handle_periodic_event("monthly")
    elif period == "yearly" and now.month == 1 and now.day == 1:
        handle_periodic_event("yearly")

# Menjadwalkan event untuk setiap periode
def schedule_events():
    schedule.every(1).minutes.do(handle_event, period="now")
    schedule.every().hour.do(handle_event, period="daily")
    schedule.every().day.at("00:00").do(handle_event, period="monthly")
    schedule.every().day.at("00:00").do(handle_event, period="yearly")

    schedule.every().day.at("00:00").do(handle_periodic_event, period="daily")
    schedule.every().day.at("00:00").do(check_and_run, period="monthly")
    schedule.every().day.at("00:00").do(check_and_run, period="yearly")
    
    while True:
        schedule.run_pending()
        time.sleep(1)

# Mulai scheduler
if __name__ == "__main__":
    schedule_events()
