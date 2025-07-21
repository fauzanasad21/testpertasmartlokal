import pandas as pd
import logging

# Konfigurasi logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Log untuk membaca file
input_file = 'generated_data.csv'  # Ganti sesuai nama file Anda
output_file = 'generated_data_no_twall1.csv'  # File output baru

logging.info(f"Membaca file {input_file}...")

try:
    df = pd.read_csv(input_file)
    logging.info("File CSV berhasil dibaca.")

    # Periksa keberadaan kolom Twall1 dan hapus
    if 'Twall1' in df.columns:
        logging.info("Kolom 'Twall1' ditemukan. Menghapus kolom...")
        df = df.drop(columns=['Twall1'])
        logging.info("Kolom 'Twall1' berhasil dihapus.")
    else:
        logging.warning("Kolom 'Twall1' tidak ditemukan dalam file.")

    # Ganti nama kolom power_prediction menjadi power_potential
    if 'power_prediction' in df.columns:
        logging.info("Kolom 'power_prediction' ditemukan. Mengganti nama kolom menjadi 'power_potential'...")
        df = df.rename(columns={'power_prediction': 'power_potential'})
        logging.info("Nama kolom 'power_prediction' berhasil diganti menjadi 'power_potential'.")
    else:
        logging.warning("Kolom 'power_prediction' tidak ditemukan dalam file.")

    # Simpan ke file CSV baru
    df.to_csv(output_file, index=False)
    logging.info(f"Data yang sudah dimodifikasi disimpan di file baru: {output_file}")
except FileNotFoundError:
    logging.error(f"File {input_file} tidak ditemukan. Pastikan nama file sudah benar.")
except Exception as e:
    logging.error(f"Terjadi kesalahan: {e}")
