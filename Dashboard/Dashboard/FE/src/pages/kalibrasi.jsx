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
  const [calibrateSensor, setcalibrateSensor] = useState({
    dryness: { min: 0, max: 0 },
    temperature: { min: 0, max: 0 },
    pressure: { min: 0, max: 0 },
    flow: { min: 0, max: 0 },
    power_potential: { min: 0, max: 0 },
  });
  const [sensorDatacalibrates, setSensorDatacalibrates] = useState({
    dryness: { min: null, max: null },
    temperature: { min: null, max: null },
    pressure: { min: null, max: null },
    flow: { min: null, max: null },
    power_potential: { min: null, max: null },
  });

  const fetchSensorcalibrates = async () => {
    try {
      const url = "http://localhost:9921/api/dataCalibration";

      const response = await fetch(url, {
        credentials: "include",  
      });
      const data = await response.json();

      const calibrateTemp = data.find((item) => item.sensor_type === "temperature");
      const calibrateFlow = data.find((item) => item.sensor_type === "flow");
      const calibratePress = data.find((item) => item.sensor_type === "pressure");

      setSensorDatacalibrates({
        temperature: { max: calibrateTemp.max_value, min: calibrateTemp.min_value },
        pressure: { max: calibratePress.max_value, min: calibratePress.min_value },
        flow: { max: calibrateFlow.max_value, min: calibrateFlow.min_value },
      });
    } catch (error) {
      console.error("Error fetching sensor calibrates:", error);
    }
  };

  const handleOpenModal = (sensor) => {
    setModalType(2);
    setModalData({
      name: sensor,
      value: sensorDatacalibrates[sensor],
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const updatecalibrate = (sensor, type, value) => {
    if (
      sensor === "pressure" ||
      sensor === "temperature" ||
      sensor === "flow"
    ) {
      const caliMin = calibration[sensor]?.min;
      const caliMax = calibration[sensor]?.max;

        setSensorDatacalibrates((prevcalibrates) => ({
          ...prevcalibrates,
          [sensor]: {
            ...prevcalibrates[sensor],
            [type]: value,
          },
        }));
    } else {
      setSensorDatacalibrates((prevcalibrates) => ({
        ...prevcalibrates,
        [sensor]: {
          ...prevcalibrates[sensor],
          [type]: value,
        },
      }));
    }
  };

  useEffect(() => {
    fetchSensorcalibrates();
  }, []);

  return (
    <div className="">
      <div className="bg-white rounded-lg p-4 mb-5 flex items-center justify-between mt-10 md:mt-20 lg:mt-5">
        <p className="text-2xl font-bold"> Settings calibrate </p>
        <p className="text-base">Mohon untuk tidak sembarangan mengganti nilai kalibrasi, <strong>karena akan berdampak ke konversi arus dengan nilai sebenarnya</strong></p>
      </div>
      <SensorLimitCard
        name="Pressure"
        icon={Pressure}
        data={sensorDatacalibrates.pressure}
        onChange={(type, value) => updatecalibrate("pressure", type, value)}
        onSave={() => handleOpenModal("pressure")}
      />
      <SensorLimitCard
        name="Temperature"
        icon={Temperature}
        data={sensorDatacalibrates.temperature}
        onChange={(type, value) => updatecalibrate("temperature", type, value)}
        onSave={() => handleOpenModal("temperature")}
      />
      <SensorLimitCard
        name="Flow"
        icon={Flow}
        data={sensorDatacalibrates.flow}
        onChange={(type, value) => updatecalibrate("flow", type, value)}
        onSave={() => handleOpenModal("flow")}
      />

      {modalOpen && (
        <Modal type={modalType} close={handleCloseModal} data={modalData} />
      )}
    </div>
  );
};

export default Batas;
