const websocketURL = "http://localhost:9923/ws/";

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const connectWebSocket = () => {
  socket = new WebSocket(websocketURL);

  socket.onopen = () => {
    //console.log("WebSocket connected.");
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const incomingMessage = JSON.parse(event.data);

      if (
        incomingMessage.realtime_buffer ||
        incomingMessage.tenMinutes_buffer ||
        incomingMessage.thirtyMinutes_buffer ||
        incomingMessage.oneHour_buffer ||
        incomingMessage.oneDay_buffer
      ) {
        // Data awal
        const parseBuffer = (buffer) =>
          buffer.map((item) => {
            const data = typeof item === "string" ? JSON.parse(item) : item;
            return {
              x: data.timestamp,
              ...data,
            };
          });

        const realtimeData = parseBuffer(incomingMessage.realtime_buffer || []);
        const tenMinutesData = parseBuffer(incomingMessage.tenMinutes_buffer || []);
        const thirtyMinutesData = parseBuffer(incomingMessage.thirtyMinutes_buffer || []);
        const oneHourData = parseBuffer(incomingMessage.oneHour_buffer || []);
        const oneDayData = parseBuffer(incomingMessage.oneDay_buffer || []);
        // //console.log('data day ', oneDayData)
        // //console.log('data jam ', oneHourData)
        // //console.log('data 30 ', thirtyMinutesData)
        // //console.log('data 10 ', tenMinutesData)
        // //console.log('data real ', realtimeData)
        postMessage({
          type: "initial",
          data: {
            realtime: realtimeData,
            tenMinutes: tenMinutesData,
            thirtyMinutes: thirtyMinutesData,
            oneHour: oneHourData,
            oneDay: oneDayData
          },
        });
      } else if (incomingMessage.type) {
        // Data broadcast
        const { type, data } = incomingMessage;
        const parsedData = typeof data === "string" ? JSON.parse(data) : data;

        const broadcastData = {
          x: parsedData.timestamp,
          ...parsedData,
        };

        postMessage({
          type: "update",
          bufferType: type,
          newData: broadcastData,
        });

        // Perbarui dataCard hanya untuk realtime
        if (type === "realtime") {
          postMessage({
            type: "updateCard",
            latestCard: {
              dryness_steam: parsedData.dryness,
              temperature: parsedData.temperature,
              pressure: parsedData.pressure,
              flow: parsedData.flow,
              energi: parsedData.power_potential,
              anomali_status: parsedData.anomali_status,
              fitur_anomali: parsedData.fitur_anomali
            },
          });
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    //console.log("WebSocket closed. Attempting to reconnect...");
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(connectWebSocket, 2000);
    } else {
      postMessage({ type: "error", message: "Failed to reconnect to WebSocket." });
    }
  };
};

// Mulai koneksi WebSocket
connectWebSocket();
