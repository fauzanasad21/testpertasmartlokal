import websockets
import json
import asyncio
import config

ws_connection = None

async def connect_to_node():
    global ws_connection
    uri = config.WEBSOCKET_URI
    try:
        ws_connection = await websockets.connect(uri)
        print("WebSocket connection established with Node.js")
    except Exception as e:
        print(f"Error establishing WebSocket connection: {e}")

async def reconnect_to_node(retry_limit=5, retry_delay=5):
    global ws_connection
    for attempt in range(1, retry_limit + 1):
        try:
            print(f"Attempting to reconnect... (Attempt {attempt}/{retry_limit})")
            await connect_to_node()
            print("Reconnected to WebSocket successfully.")
            break  
        except Exception as e:
            print(f"Reconnect attempt failed: {e}")
        
        if attempt < retry_limit:
            print(f"Retrying in {retry_delay} seconds...")
            await asyncio.sleep(retry_delay)
        else:
            print("Max retries reached. Could not reconnect to WebSocket.")
            break  

async def send_data_to_node(data):
    global ws_connection
    
    try:
        if ws_connection is None:
            print("Reconnecting to WebSocket...")
            await reconnect_to_node()
        
        # Handling if connection is closed
        try:
            print(f"Sending data to Node.js: {data}")
            json_data = json.dumps(data, default=str)
            await ws_connection.send(json.dumps(json_data))
            response = await ws_connection.recv()
            #print(f"Response from Node.js: {response}")
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection is closed.")
            await reconnect_to_node()
    except Exception as e:
        print(f"Error sending data through WebSocket: {e}")