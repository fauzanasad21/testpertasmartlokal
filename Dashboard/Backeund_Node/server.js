const express = require('express');
const http = require('http'); 
const fs = require('fs'); 
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { setupWebSocket, setupWebSocketForPython, setupWebSocketForUser } = require('./services_WebSocket/ws');
const router = require('./routes/Routes');
const cors = require('cors');
const redis = require('redis');

const client = redis.createClient();

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.on('connect', () => {
    console.log('Redis client connected');
});

client.on('ready', () => {
    console.log('Redis client is ready');
});

client.on('end', () => {
    console.log('Redis client disconnected');
});

client.on('reconnecting', (delay, attempt) => {
    console.log(`Redis client attempting to reconnect. Delay: ${delay}ms, Attempt: ${attempt}`);
});

// Tambahkan interval untuk logging active handles
// setInterval(() => {
//     console.log('Active Handles:', process._getActiveHandles());
//     console.log('Active Requests:', process._getActiveRequests());
// }, 5000); // Jalankan setiap 5 detik
client.connect().then(() => {
    console.log('Redis client connected');
    const app = express();
    
    // app.use(cors({
    //     credentials: true,
    //     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    //     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    //     origin: ['http://ks096wzd-80.asse.devtunnels.ms/', 'http://localhost:5173'] // <-- Perbaikan di sini
    // }));

    app.use(express.json());
    app.use(cookieParser());

    app.use((req, res, next) => {
        if (!client.isReady) {
            console.error('Redis client is not ready');
            return res.status(500).json({ message: 'Redis client is not ready' });
        }
        req.redisClient = client;

        next();
    });

    app.use('/api', router);

    const server = http.createServer(app); 
    // const wss = setupWebSocket(server);

    // server.on('upgrade', (req, socket, head) => {
    //     const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    //     if (pathname === '/ws/') {
    //         wss.handleUpgrade(req, socket, head, (ws) => {
    //             wss.emit('connection', ws, req);
    //         });
    //     } else {
    //         socket.destroy(); 
    //     }
    // });

    const PORT = process.env.PORT || 9921;
    server.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });

    // Tangani shutdown dengan menutup Redis client
    const shutdown = async () => {
        console.log('Shutting down server...');
        try {
            await client.quit(); // Tutup koneksi Redis
            console.log('Redis client disconnected gracefully');
        } catch (err) {
            console.error('Error shutting down Redis client:', err);
        } finally {
            process.exit(0); // Akhiri proses Node.js
        }
    };

    // Tangkap event shutdown
    process.on('SIGINT', shutdown);  // Ctrl+C di terminal
    process.on('SIGTERM', shutdown); // Shutdown dari sistem
}).catch((err) => {
    console.error('Gagal terhubung ke Redis:', err);
});
