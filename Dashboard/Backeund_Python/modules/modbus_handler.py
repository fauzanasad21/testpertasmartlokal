import time
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusIOException, ConnectionException
import config
import asyncio

def connect_modbus():
    client = ModbusTcpClient(config.IP, port=config.PORT)
    if not client.connect():
        print(f"Failed to connect to Modbus server at {config.IP}:{config.PORT}")
        return None
    return client

def reconnect_modbus():
    while True:
        try:
            client = ModbusTcpClient(config.IP, port=config.PORT) 
            if client.connect():
                print(f"Reconnected to Modbus server at {config.IP}:{config.PORT}")
                return client
            else:
                raise ConnectionException("Failed to reconnect to Modbus server")
        except Exception as e:
            print(f"Error reconnecting Modbus: {str(e)}")
            time.sleep(5)

def configure_output_mode_to_4_20ma(client):
    """
    Mengatur mode output AO ke 4-20 mA.
    """
    try:
        result = client.write_register(0x0514, 0x0001)
        if result.isError():
            print("Gagal mengatur mode output AO ke 4-20 mA")
        else:
            print("Mode output AO diatur ke 4-20 mA")
    except Exception as e:
        print(f"Error setting AO output mode: {e}")

def read_modbus_data(client, address, num_registers, sensor_names):
    try:
        # Baca beberapa register sekaligus
        result = client.read_input_registers(address, num_registers)
        if isinstance(result, ModbusIOException) or result.isError():
            raise Exception(f"Modbus read error at address {address} for sensors {sensor_names}")

        parsed_data = {}
        for i, sensor_name in enumerate(sensor_names):
            # Ambil nilai register dan kalibrasi
            data_signal = result.registers[i] * 1e-3
            print(f"data signal {i}  :  {data_signal}")
            min_value = config.CALIBRATION_SETTINGS[sensor_name]['min']
            max_value = config.CALIBRATION_SETTINGS[sensor_name]['max']
            print(f"min_value {i} : {min_value}")
            print(f"max_value {i} : {max_value}")
            # Kalkulasi nilai aktual berdasarkan rentang kalibrasi
            value = ((data_signal - 4) * (max_value - min_value) / (20 - 4)) + min_value
            parsed_data[sensor_name] = value

            #print(f"{sensor_name} at address {address + i}: {value}")

        return parsed_data
    
    except Exception as e:
        print(f"Read Error: {str(e)}")
        return None
    
def send_dryness_to_modbus(client, dryness_value, address=100, address1=101):
    try:
        if dryness_value < 0 :
            dryness_value = 0

        scaled_dryness = int(((dryness_value - 95) * (16000  / (105 - 95))) + 4000)

        result = client.write_register(address, scaled_dryness)
        print(f'Data Arus: {scaled_dryness}')
        
        if result.isError():
            print(f"Failed to write dryness value to Modbus at address {hex(address)}")
        else:
            print(f"Dryness value {dryness_value} sent to Modbus address {hex(address)} successfully.")
        

    except Exception as e:
        print(f"Error sending dryness to Modbus: {e}")

async def send_dryness_to_modbus_async(client, dryness_value, address=100):
    loop = asyncio.get_event_loop()
    try:
        # Eksekusi fungsi sinkron dalam thread lain
        await loop.run_in_executor(None, send_dryness_to_modbus, client, dryness_value, address)
    except Exception as e:
        print(f"Error in async Modbus dryness send: {e}")