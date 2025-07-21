def send_dryness_to_modbus(client, dryness_value, address=100, address1=101):
    """
    Mengirim nilai dryness ke alamat Modbus yang ditentukan dalam rentang 4-20 mA.
    
    Parameters:
        client (ModbusTcpClient): Client Modbus yang terhubung.
        dryness_value (float): Nilai dryness yang akan dikirim.
        address (int): Alamat Modbus untuk menulis nilai dryness.
    """
    try:
        if dryness_value < 0 :
            dryness_value = 0
        #dryness_value = 102.595
        scaled_dryness = int(((dryness_value - 95) * (16000 / (105 - 95))) + 4000)
        # scaled_dryness = int((dryness_value / 105) * 16000 + 4000)  # 4-20 mA di μA
        result = client.write_register(address, scaled_dryness)
        print('data arus dryness ', scaled_dryness)
        if result.isError():
            print(f"Failed to write dryness value to Modbus at address {hex(address)}")
        else:
            print(f"Dryness value {dryness_value} sent to Modbus address {hex(address)} successfully.")
    except Exception as e:
        print(f"Error sending dryness to Modbus: {e}")