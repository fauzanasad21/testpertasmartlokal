import math
from datetime import datetime
import pandas as pd

def calculateFlow(IN1, IN2, IN3):
    # Konstanta dalam formula
    constant1 = 169.2 + 273.15
    constant2 = 6.89 + 0.95
    
    # Formula perhitungan
    result = 420 * math.sqrt(
        (constant1 / (IN3 + 273.15)) * ((IN2 + 0.95) / constant2) * 4 * IN1
    )
    return result

def datetime_converter(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()  # Convert datetime to ISO 8601 string format
    raise TypeError("Type not serializable")

def validate_sensor_data(flow, pressure, temperature):
    flow = max(0, flow)
    pressure = max(0, pressure)
    temperature = max(0, temperature)
    return flow, pressure, temperature

def convert_to_column(variable, column_name):
    df = pd.DataFrame({column_name: variable})
    return df

