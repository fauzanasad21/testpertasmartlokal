import psycopg2
from psycopg2 import OperationalError
import config # Impor konfigurasi

db_connection = None
failed_db_batch = []

def init_db():
    """Initialize the database connection and create the table if it doesn't exist."""
    try:
        conn = psycopg2.connect(**config.DATABASE_CONFIG)
        cursor = conn.cursor()
        conn.commit()
        print("Database initialized and Real_Time_Data table created.")
    except OperationalError as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()

def connect_db():
    """Establishes a persistent database connection."""
    global db_connection
    try:
        db_connection = psycopg2.connect(**config.DATABASE_CONFIG)
        print("Connected to the database.")
    except OperationalError as e:
        print(f"Failed to connect to database: {e}")
        db_connection = None

def load_calibration_from_db():
    """Load calibration data from the database and initialize calibration settings."""
    global calibration_settings
    try:
        conn = psycopg2.connect(**config.DATABASE_CONFIG)
        cursor = conn.cursor()
        query = "SELECT sensor_type, min_value, max_value FROM public.sensor_calibration ORDER BY sensor_type ASC"
        cursor.execute(query)
        rows = cursor.fetchall()

        for row in rows:
            sensor_type, min_value, max_value = row
            if sensor_type in calibration_settings:
                calibration_settings[sensor_type]['min'] = min_value
                calibration_settings[sensor_type]['max'] = max_value
                print(f"Loaded calibration for {sensor_type}: min={min_value}, max={max_value}")
            else:
                print(f"Sensor type '{sensor_type}' in database is not recognized in the application.")

        cursor.close()
        conn.close()
        print("Calibration data loaded from the database successfully.")

    except Exception as e:
        print(f"Failed to load calibration data from database: {e}")

async def save_to_database_async(data):
    """Asynchronous database save with retry mechanism."""
    global db_connection, failed_db_batch
    batch_data = failed_db_batch + [data]  

    if db_connection is None :
        connect_db()  

    try:
        cursor = db_connection.cursor()
        for item in batch_data:
            cursor.execute('''
                INSERT INTO real_time_data (timestamp, flow, pressure, temperature, dryness, power_potential, anomali)
                VALUES (%s, %s, %s, %s, %s, %s,)
            ''', (item['timestamp'], item['flow'], item['pressure'], item['temperature'],
                  item['dryness'], item['power_potential']))
        db_connection.commit()
        #print("Data batch saved to database.")
        failed_db_batch = []  # Clear batch jika berhasil
        print('data tersimpan di database')
    except OperationalError as e:
        print(f"Database error: {e}")
        failed_db_batch = batch_data  # Simpan ulang batch jika gagal
    finally:
        if db_connection :
            cursor.close()

