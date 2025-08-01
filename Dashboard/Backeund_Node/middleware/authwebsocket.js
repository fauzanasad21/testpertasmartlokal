const cookie = require('cookie'); // Untuk membaca cookie dari header
const { jwt, JWT_SECRET } = require('../config/auth'); // Konfigurasi JWT

// Middleware autentikasi untuk WebSocket
async function authenticateWebSocket(req, socket) {
    try {
        const cookies = cookie.parse(req.headers.cookie || ''); // Parse cookie dari header
        const accessToken = cookies.accessToken;
        const refreshToken = cookies.refreshToken;

        if (!accessToken) {
            throw new Error('Unauthorized: No access token');
        }

        // Verifikasi access token
        const decoded = jwt.verify(accessToken, JWT_SECRET);

        // Simpan informasi user di request untuk WebSocket
        req.userId = decoded.id;
        return true; // Otentikasi berhasil
    } catch (err) {
        console.error('WebSocket authentication failed:', err.message);

        // Tolak koneksi jika autentikasi gagal
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return false;
    }
}

module.exports = { authenticateWebSocket };
