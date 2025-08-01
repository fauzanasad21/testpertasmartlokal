const http = require('http'); // Gunakan HTTP untuk server
const { setupWebSocket } = require('./services_WebSocket/ws'); // Impor fungsi setupWebSocket
require('dotenv').config();

// Membuat server HTTP untuk WebSocket
const websocketServer = http.createServer(); // Tidak perlu express karena hanya untuk WebSocket

// Setup WebSocket menggunakan fungsi dari ws.js
const wss = setupWebSocket(websocketServer);

// Tangani permintaan upgrade untuk zzzzWebSocket
websocketServer.on('upgrade', (req, socket, head) => {
    try {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);
        const normalizedPathname = pathname.replace(/\/$/, ""); // Hilangkan trailing slash

        console.log('Upgrade request received');
        console.log('Normalized Pathname:', normalizedPathname);
        console.log('Headers received:', req.headers);

        if (normalizedPathname === '/ws') {
            console.log('Valid path, proceeding with WebSocket upgrade');
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        } else {
            console.log('Invalid WebSocket path, closing socket:', pathname);
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
        }
    } catch (err) {
        console.error('Error during WebSocket upgrade:', err);
        socket.destroy();
    }
});

// Tangani error di server HTTP
websocketServer.on('error', (err) => {
    console.error('WebSocket server error:', err);
});

// Jalankan server WebSocket di port tertentu
const WS_PORT = process.env.WS_PORT || 9923; // Gunakan default port 9923 jika tidak ada variabel lingkungan
websocketServer.listen(WS_PORT, () => {
    console.log(`WebSocket server berjalan di ws://localhost:${WS_PORT}`);
});
