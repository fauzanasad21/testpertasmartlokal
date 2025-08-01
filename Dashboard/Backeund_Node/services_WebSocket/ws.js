const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');
const { date } = require('joi');

class CircularBuffer {
    constructor(size) {
        this.size = size;
        this.buffer = new Array(size);
        this.head = 0;
        this.count = 0;
    }

    push(data) {
        this.buffer[this.head] = data;
        this.head = (this.head + 1) % this.size;
        if (this.count < this.size) {
            this.count++;
        }
    }

    getAll() {
        const result = [];
        for (let i = 0; i < this.count; i++) {
            const index = (this.head - this.count + i + this.size) % this.size;
            result.push(this.buffer[index]);
        }
        return result;
    }
}

// Circular Buffers
const realtimeBuffer = new CircularBuffer(60);
const tenMinutesBuffer = new CircularBuffer(20);
const thirtyMinutesBuffer = new CircularBuffer(60);
const oneHourBuffer = new CircularBuffer(60);
const oneDayBuffer = new CircularBuffer(24);

// Agregasi Data
function aggregateData(dataArray, interval) {
    if (!dataArray || dataArray.length === 0) {
        // console.log(`[AGGREGATION ERROR] No data to aggregate for interval: ${interval}`);
        return {
            flow: 0,
            pressure: 0,
            temperature: 0,
            dryness: 0,
            power_potential: 0,
            timestamp: new Date().toISOString(),
            interval,
        };
    }

    // Parse dan validasi data
    const validDataArray = dataArray.map((item) => {
        // Coba parse jika masih string
        if (typeof item === 'string') {
            try {
                item = JSON.parse(item);
            } catch (err) {
                console.error(`[AGGREGATION ERROR] Failed to parse item: ${item}`, err);
                return null;
            }
        }

        // Validasi tipe data
        if (
            typeof item.flow === 'number' &&
            typeof item.pressure === 'number' &&
            typeof item.temperature === 'number' &&
            typeof item.dryness === 'number' &&
            typeof item.power_potential === 'number'
        ) {
            return item; // Data valid
        } else {
            console.warn(`[AGGREGATION WARNING] Invalid item structure:`, item);
            return null;
        }
    }).filter((item) => item !== null); // Hanya data valid

    if (validDataArray.length === 0) {
        // console.log(`[AGGREGATION ERROR] All data is invalid for interval: ${interval}`);
        return {
            flow: NaN,
            pressure: NaN,
            temperature: NaN,
            dryness: NaN,
            power_potential: NaN,
            timestamp: new Date().toISOString(),
            interval,
        };
    }

    // Log data valid yang digunakan
    // console.log(`[AGGREGATION INFO] Valid data for aggregation (${interval}):`, validDataArray);

    // Hitung rata-rata dari data valid
    const aggregated = validDataArray.reduce(
        (acc, item) => {
            acc.flow += item.flow;
            acc.pressure += item.pressure;
            acc.temperature += item.temperature;
            acc.dryness += item.dryness;
            acc.power_potential += item.power_potential;
            return acc;
        },
        { flow: 0, pressure: 0, temperature: 0, dryness: 0, power_potential: 0 }
    );

    const count = validDataArray.length;
    const result = {
        flow: aggregated.flow / count,
        pressure: aggregated.pressure / count,
        temperature: aggregated.temperature / count,
        dryness: aggregated.dryness / count,
        power_potential: aggregated.power_potential / count,
        timestamp: new Date().toISOString(),
        timestampsend: Date.now(),
        interval,
    };

    return result;
}



let wssInstance;

// Temporary buffers for aggregating data
let tempBuffer15 = [];
let tempBuffer30 = [];
let tempBuffer60 = [];
let tempBuffer1440 = [];

const connectedClients = {};
function logConnectedUsers() {
    const connectedUserIds = Object.keys(connectedClients);
    console.log('Pengguna yang sedang terhubung:', connectedUserIds.length > 0 ? connectedUserIds.join(', ') : 'Tidak ada pengguna yang terhubung');
  }

function setupWebSocket(server) {
    if (!wssInstance) {
        wssInstance = new WebSocket.Server({ noServer: true });

        wssInstance.on('connection', (ws, req) => {
            //console.log('New WebSocket connection:', req.headers);
            const clientAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            console.log(`Client connected from ${clientAddress}`);

            const userId = `User ${Date.now()} | ${clientAddress}`
            connectedClients[userId] = ws;
  
            console.log(`${userId} terhubung`);
            logConnectedUsers();
            
            if (clientAddress === '127.0.0.1' || clientAddress === '::1' || clientAddress === '::ffff:127.0.0.1') {
                console.log('Connection accepted from local client');
            }// else {
            //     console.log('Connection accepted from nonlocal client');
            //     // Ekstrak token dari cookie header
            //     const cookies = req.headers.cookie;
            //     if (!cookies || !cookies.includes('accessToken=')) {
            //         ws.close(4001, 'Unauthorized');
            //         return;
            //     }
    
            //     const accessToken = cookies
            //         .split('; ')
            //         .find(row => row.startsWith('accessToken='))
            //         .split('=')[1];
    
            //     try {
            //         const decoded = jwt.verify(accessToken, JWT_SECRET);
            //         console.log('User authenticated:', decoded.id);
            //         ws.userId = decoded.id; // Tambahkan ID user ke koneksi WebSocket
            //     } catch (err) {
            //         console.error('Token verification failed:', err.message);
            //         ws.close(4001, 'Unauthorized');
            //         return;
            //     }
            // }
            // Kirim data buffer saat koneksi pertama
            const bufferData = {
                realtime_buffer: realtimeBuffer.getAll(),
                tenMinutes_buffer: tenMinutesBuffer.getAll(),
                thirtyMinutes_buffer: thirtyMinutesBuffer.getAll(),
                oneHour_buffer: oneHourBuffer.getAll(),
                oneDay_buffer: oneDayBuffer.getAll()
            };
            //console.log('[BUFFER SEND] Sending buffered data to new client:', bufferData);
            ws.send(JSON.stringify(bufferData));

            ws.on('message', (message) => {
                const messageString = message.toString('utf8');
                let data = JSON.parse(messageString);
                //let data = JSON.parse(data2); 
                const serverTime = Date.now()
                if (data.type === "ping") {
                  ws.send(JSON.stringify({
                    type: "pong",
                    clientSendTime: data.clientSendTime,
                    serverTime: serverTime
                  }));
                }
                // console.log("datakuuu  ", data)
                data.timestampsend = serverTime;
                // console.log(data)
                // Simpan ke buffer realtime
                realtimeBuffer.push(data);
                broadcastData({ type: 'realtime', data });

                // Tambahkan ke buffer sementara untuk agregasi
                tempBuffer15.push(data);
                tempBuffer30.push(data);
                tempBuffer60.push(data);
                tempBuffer1440.push(data);

                // Jika buffer sementara mencapai jumlah data tertentu, lakukan agregasi
                if (tempBuffer15.length === 15) {
                    const aggregated = aggregateData(tempBuffer15, '15s');
                    tempBuffer15 = []; // Reset buffer sementara
                    tenMinutesBuffer.push(aggregated); // Simpan ke circular buffer
                    broadcastData({ type: 'tenMinutes', data: aggregated }); // Kirim ke klien
                }

                if (tempBuffer30.length === 30) {
                    const aggregated = aggregateData(tempBuffer30, '30s');
                    tempBuffer30 = [];
                    thirtyMinutesBuffer.push(aggregated);
                    broadcastData({ type: 'thirtyMinutes', data: aggregated }); 
                }

                if (tempBuffer60.length === 60) {
                    const aggregated = aggregateData(tempBuffer60, '1m');
                    tempBuffer60 = []; 
                    oneHourBuffer.push(aggregated); 
                    broadcastData({ type: 'oneHour', data: aggregated }); 
                }

                if (tempBuffer1440.length === 3600) {
                    const aggregated = aggregateData(tempBuffer1440, '1h');
                    tempBuffer1440 = []; 
                    oneDayBuffer.push(aggregated); 
                    broadcastData({ type: 'oneDay', data: aggregated }); 
                }
            });
        ws.on('close', () => {
            delete connectedClients[userId]; // Hapus user dari daftar saat disconnect
            console.log(`${userId} terputus`);
            logConnectedUsers(); // Log ulang untuk menunjukkan user sudah hilang
    });
        });
    }
    return wssInstance;
}

function broadcastData(data) {
    //console.log('[BROADCAST] Broadcasting data to clients:', data);
    wssInstance.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

module.exports = { setupWebSocket };
