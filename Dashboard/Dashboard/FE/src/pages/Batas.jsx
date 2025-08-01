import { useState, useEffect } from "react";
import Temperature from "../assets/TemperatureIcon.svg";
import Flow from "../assets/FlowIcon.svg";
import Pressure from "../assets/PressureIcon.svg";
import drynessIcon from "../assets/DrynessIcon.svg";
import Modal from "../components/modal/modal";
import PowerIcon from "../assets/PowerIcon.svg";
import SensorLimitCard from "../components/sensorLimitCard/sensorLimitCard";

const Batas = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [calibration, setcalibration] = useState({
    dryness: { min: 0, max: 0 },
    temperature: { min: 0, max: 0 },
    pressure: { min: 0, max: 0 },
    flow: { min: 0, max: 0 },
    power_potential: { min: 0, max: 0 },
  });
  const [limitSensor, setLimitSensor] = useState({
    dryness: { min: 0, max: 0 },
    temperature: { min: 0, max: 0 },
    pressure: { min: 0, max: 0 },
    flow: { min: 0, max: 0 },
    power_potential: { min: 0, max: 0 },
  });
  const [sensorDataLimits, setSensorDataLimits] = useState({
    dryness: { min: null, max: null },
    temperature: { min: null, max: null },
    pressure: { min: null, max: null },
    flow: { min: null, max: null },
    power_potential: { min: null, max: null },
  });

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };
  
  const checkUserRole = () => {
    const accessToken = getCookie('accessToken');
    if (!accessToken) return null;
  
    // Decode JWT token untuk mengambil payload
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    return payload.role; // Return 'admin' or 'user'
  };

  const fetchSensorLimits = async () => {
    try {
      const url = "http://localhost:9921/api/getLimit";

      const response = await fetch(url, {
        credentials: "include",  
      });
      const data = await response.json();

      const limitTemp = data.find((item) => item.data === "temperature");
      const limitFlow = data.find((item) => item.data === "flow");
      const limitDry = data.find((item) => item.data === "dryness");
      const limitPress = data.find((item) => item.data === "pressure");
      const limitPower = data.find((item) => item.data === "power_potential");

      setSensorDataLimits({
        dryness: { max: limitDry.upperlimit, min: limitDry.bottomlimit },
        temperature: { max: limitTemp.upperlimit, min: limitTemp.bottomlimit },
        pressure: { max: limitPress.upperlimit, min: limitPress.bottomlimit },
        flow: { max: limitFlow.upperlimit, min: limitFlow.bottomlimit },
        power_potential: {
          max: limitPower.upperlimit,
          min: limitPower.bottomlimit,
        },
      });
    } catch (error) {
      console.error("Error fetching sensor limits:", error);
    }
  };

  const fetchCaliLimit = async () => {
    try {
      const url =
        "http://localhost:9921/api/dataCalibration";
      const response = await fetch(url, {
        credentials: "include",
      });
      const data = await response.json();
      const limitTemp = data.find((item) => item.sensor_type === "temperature");
      const limitFlow = data.find((item) => item.sensor_type === "flow");
      const limitPress = data.find((item) => item.sensor_type === "pressure");

      setcalibration({
        temperature: { max: limitTemp.max_value, min: limitTemp.min_value },
        pressure: { max: limitPress.max_value, min: limitPress.min_value },
        flow: { max: limitFlow.max_value, min: limitFlow.min_value },
      });
    } catch (error) {
      console.error("Error fetching sensor limits:", error);
    }
  };

  const handleOpenModal = (sensor) => {
    setModalType(3); // Tipe modal batas sensor
    setModalData({
      name: sensor,
      value: sensorDataLimits[sensor],
    });
    setModalOpen(true);
  };
  
  

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const updateLimit = (sensor, type, value) => {
    if (
      sensor === "pressure" ||
      sensor === "temperature" 
      // sensor === "flow"
    ) {
      const caliMin = calibration[sensor]?.min;
      const caliMax = calibration[sensor]?.max;

      if (value >= caliMin && value <= caliMax) {
        setSensorDataLimits((prevLimits) => ({
          ...prevLimits,
          [sensor]: {
            ...prevLimits[sensor],
            [type]: value,
          },
        }));
      } else {
        console.warn(
          `Value ${value} is out of calibration range for ${sensor}. Min: ${caliMin}, Max: ${caliMax}`
        );
      }
    } else {
      setSensorDataLimits((prevLimits) => ({
        ...prevLimits,
        [sensor]: {
          ...prevLimits[sensor],
          [type]: value,
        },
      }));
    }
  };

  useEffect(() => {
    fetchSensorLimits();
    fetchCaliLimit();
  }, []);

  return (
    <div className="">
      <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between mt-10 md:mt-20 lg:mt-5">
        <p className="text-2xl font-bold"> Settings Limit </p>
      </div>
      <SensorLimitCard
        name="Pressure"
        icon={Pressure}
        limit={limitSensor.pressure}
        data={sensorDataLimits.pressure}
        onChange={(type, value) => updateLimit("pressure", type, value)}
        onSave={() => handleOpenModal("pressure")}
      />
      <SensorLimitCard
        name="Temperature"
        icon={Temperature}
        limit={limitSensor.temperature}
        data={sensorDataLimits.temperature}
        onChange={(type, value) => updateLimit("temperature", type, value)}
        onSave={() => handleOpenModal("temperature")}
      />
      <SensorLimitCard
        name="Flow"
        icon={Flow}
        limit={limitSensor.flow}
        data={sensorDataLimits.flow}
        onChange={(type, value) => updateLimit("flow", type, value)}
        onSave={() => handleOpenModal("flow")}
      />

      <SensorLimitCard
        name="Power Potential"
        icon={PowerIcon}
        limit={limitSensor.power_potential}
        data={sensorDataLimits.power_potential}
        onChange={(type, value) => updateLimit("power_potential", type, value)}
        onSave={() => handleOpenModal("power_potential")}
      />
      <SensorLimitCard
        name="Dryness"
        icon={drynessIcon}
        limit={limitSensor.dryness}
        data={sensorDataLimits.dryness}
        onChange={(type, value) => updateLimit("dryness", type, value)}
        onSave={() => handleOpenModal("dryness")}
      />

      {modalOpen && (
        <Modal type={modalType} close={handleCloseModal} data={modalData} />
      )}
    </div>
  );
};

export default Batas;
