import { createContext, useContext, useEffect, useState } from "react";
import Worker from "./worker.js?worker";

const WorkerContext = createContext();

const limitDataLengthReal = (data, maxLength = 60) => {
  if (data.length > maxLength) {
    return data.slice(data.length - maxLength);
  }
  return data;
};

const limitDataLengthTen = (data, maxLength = 20) => {
  if (data.length > maxLength) {
    return data.slice(data.length - maxLength);
  }
  return data;
};

const limitDataLengthThirty = (data, maxLength = 60) => {
  if (data.length > maxLength) {
    return data.slice(data.length - maxLength);
  }
  return data;
};

const limitDataLengthOneHour = (data, maxLength = 60) => {
  if (data.length > maxLength) {
    return data.slice(data.length - maxLength);
  }
  return data;
};

const limitDataLengthOneDay = (data, maxLength = 24) => {
  if (data.length > maxLength) {
    return data.slice(data.length - maxLength);
  }
  return data;
};

export const WorkerProvider = ({ children }) => {
  const [realtimeData, setRealtimeData] = useState([]);
  const [tenMinutesData, setTenMinutesData] = useState([]);
  const [thirtyMinutesData, setThirtyMinutesData] = useState([]);
  const [oneHourData, setOneHourData] = useState([]);
  const [oneDayData, setOneDayData] = useState([]);

  const [dataCard, setDataCard] = useState({
    dryness_steam: "-",
    temperature: "-",
    pressure: "-",
    flow: "-",
    energi: "-",
    anomali_status: "-",
    fitur_anomali: "-"
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    const worker = new Worker();

    worker.onmessage = (event) => {
      const { type, data, bufferType, newData, latestCard, message } = event.data;

      switch (type) {
        case "initial":
          // Data awal dari worker
          setRealtimeData(limitDataLengthReal(data.realtime || []));
          setTenMinutesData(limitDataLengthTen(data.tenMinutes || []));
          setThirtyMinutesData(limitDataLengthThirty(data.thirtyMinutes || []));
          setOneHourData(limitDataLengthOneHour(data.oneHour || []));
          setOneDayData(limitDataLengthOneDay(data.oneDay || []));
          break;

        case "update":
          // Tambahkan data baru ke buffer
          const updateBufferReal = (setter) => {
            setter((prev) => {
              const updatedData = [...prev, newData];
              return updatedData.length > 60 ? updatedData.slice(-60) : updatedData;
            });
          };

          const updateBufferTen = (setter) => {
            setter((prev) => {
              const updatedData = [...prev, newData];
              return updatedData.length > 20 ? updatedData.slice(-20) : updatedData;
            });
          };

          const updateBufferThirty = (setter) => {
            setter((prev) => {
              const updatedData = [...prev, newData];
              return updatedData.length > 60 ? updatedData.slice(-60) : updatedData;
            });
          };

          const updateBufferOne = (setter) => {
            setter((prev) => {
              const updatedData = [...prev, newData];
              return updatedData.length > 60 ? updatedData.slice(-60) : updatedData;
            });
          };

          const updateBufferDay = (setter) => {
            setter((prev) => {
              const updatedData = [...prev, newData];
              return updatedData.length > 24 ? updatedData.slice(-24) : updatedData;
            });
          };

          if (bufferType === "realtime") {
            updateBufferReal(setRealtimeData);
          } else if (bufferType === "tenMinutes") {
            updateBufferTen(setTenMinutesData);
          } else if (bufferType === "thirtyMinutes") {
            updateBufferThirty(setThirtyMinutesData);
          } else if (bufferType === "oneHour") {
            updateBufferOne(setOneHourData);
          } else if (bufferType === "oneDay") {
            updateBufferDay(setOneDayData);
          }

          break;

        case "updateCard":
          // Perbarui kartu data
          setDataCard(latestCard);
          break;

        case "error":
          // Tampilkan error
          setError(message);
          break;

        default:
          console.warn("Unknown message type:", type);
      }
    };
    //console.log('data day ', oneDayData)
    //console.log('data jam ', oneHourData)
    //console.log('data 30 ', thirtyMinutesData)
    //console.log('data 10 ', tenMinutesData)
    //console.log('data real ', realtimeData)
    return () => {
      worker.terminate();
    };
  }, []);

  return (
    <WorkerContext.Provider
      value={{
        realtimeData,
        tenMinutesData,
        thirtyMinutesData,
        oneHourData,
        oneDayData,
        dataCard,
        error,
      }}
    >
      {children}
    </WorkerContext.Provider>
  );
};

export const useWorker = () => useContext(WorkerContext);
