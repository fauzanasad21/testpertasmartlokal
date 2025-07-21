import psycopg2
import pandas as pd
import logging
from datetime import datetime

# Konfigurasi log
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Konfigurasi koneksi database
DB_CONFIG = {
    'dbname': 'smart_monitoring_server',
    'user': 'postgres',
    'password': 's2A#7C>E:>kwETm?',
    'host': '127.0.0.1',
    'port': 5432
}

# Fungsi untuk menghitung statistik
def calculate_statistics(period: str):
    try:
        # Koneksi ke PostgreSQL
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        logging.info(f"Memulai perhitungan statistik untuk periode: {period}")

        # Query untuk mengambil data dari aggregated_archive
        query = """
            SELECT 
                bucket, type, avg_value, min_value, max_value, stddev_value, out_of_limit_value, slope_value
            FROM aggregate_archive;
        """
        cursor.execute(query)
        data = cursor.fetchall()

        # Load data ke DataFrame
        df = pd.DataFrame(data, columns=['bucket', 'type', 'avg_value', 'min_value', 'max_value', 
                                         'stddev_value', 'out_of_limit_value', 'slope_value'])
        df['bucket'] = pd.to_datetime(df['bucket'])

        # List tipe data untuk diproses
        types = ['flow', 'temperature', 'pressure', 'dryness', 'power']
        table_map = {
            'flow': 'periodic_statistics_flow',
            'temperature': 'periodic_statistics_temperature',
            'pressure': 'periodic_statistics_pressure',
            'dryness': 'periodic_statistics_dryness',
            'power': 'periodic_statistics_power_potential'
        }

        # Perulangan untuk setiap tipe data
        for t in types:
            logging.info(f"Memproses tipe data: {t}")
            df_type = df[df['type'] == t]

            # Konversi zona waktu untuk menghindari peringatan
            df_type.loc[:, 'bucket'] = df_type['bucket'].dt.tz_convert(None)

            # Kelompokkan data berdasarkan periode
            if period == 'daily':
                df_grouped = df_type.groupby(df_type['bucket'].dt.date).agg({
                    'avg_value': 'mean',
                    'min_value': 'min',
                    'max_value': 'max',
                    'stddev_value': 'mean',
                    'out_of_limit_value': 'sum',
                    'slope_value': 'mean'
                }).reset_index().rename(columns={'bucket': 'record_time'})
            elif period == 'monthly':
                df_grouped = df_type.groupby(df_type['bucket'].dt.to_period('M')).agg({
                    'avg_value': 'mean',
                    'min_value': 'min',
                    'max_value': 'max',
                    'stddev_value': 'mean',
                    'out_of_limit_value': 'sum',
                    'slope_value': 'mean'
                }).reset_index().rename(columns={'bucket': 'record_time'})
            elif period == 'yearly':
                df_grouped = df_type.groupby(df_type['bucket'].dt.to_period('Y')).agg({
                    'avg_value': 'mean',
                    'min_value': 'min',
                    'max_value': 'max',
                    'stddev_value': 'mean',
                    'out_of_limit_value': 'sum',
                    'slope_value': 'mean'
                }).reset_index().rename(columns={'bucket': 'record_time'})

            # Konversi period kembali ke datetime
            df_grouped['record_time'] = pd.to_datetime(df_grouped['record_time'].astype(str))

            # Simpan hasil ke tabel periodic_statistics
            table_name = table_map[t]
            logging.info(f"Menginsert data ke tabel: {table_name}")
            for _, row in df_grouped.iterrows():
                cursor.execute(f"""
                    INSERT INTO {table_name} 
                    (record_time, period, avg_value, min_value, max_value, stddev_value, 
                     out_of_limit_count, slope)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    row['record_time'], period, row['avg_value'], row['min_value'],
                    row['max_value'], row['stddev_value'], row['out_of_limit_value'], row['slope_value']
                ))

        # Commit perubahan
        conn.commit()
        logging.info(f"Perhitungan statistik untuk periode {period} selesai.")
    
    except Exception as e:
        logging.error(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()
        logging.info("Koneksi database ditutup.")

# Panggil fungsi untuk menghitung statistik
logging.info("Memulai proses perhitungan...")
calculate_statistics('daily')  # Untuk daily
calculate_statistics('monthly')  # Untuk monthly
calculate_statistics('yearly')  # Untuk yearly
logging.info("Proses perhitungan selesai.")
