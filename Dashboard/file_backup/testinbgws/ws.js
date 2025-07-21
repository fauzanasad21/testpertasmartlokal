const wsUrl = 'wss://localhost:9922/ws';

const WebSocket = require('ws');

// Tambahkan headers (jika diperlukan)
const headers = {
  Cookie: 'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzMzMjg2NTA2LCJleHAiOjE3MzMyODc0MDZ9.gT7SMJbMOtZHt3TfXcTf-NbVGMpbis2a5HbYY1890WE; refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmdWxsX25hbWUiOiJEZW1vX0FjY291bnQxIiwiaWF0IjoxNzMyMzc4NDU2LCJleHAiOjE3MzI5ODMyNTZ9.Sf-f1fst08KS-663wOFnNxpsp3-t7viAY1k18Oz33TQ'
};

// Membuka koneksi WebSocket langsung
const ws = new WebSocket(wsUrl, { headers });

ws.on('open', () => console.log('Connected to WebSocket:', wsUrl));

// Modifikasi handler 'message' untuk mendecode buffer
ws.on('message', (data) => {
  try {
    // Asumsikan data adalah JSON yang terencode dalam UTF-8
    const decodedData = JSON.parse(data.toString('utf8'));
    console.log('Message received:', decodedData);
  } catch (err) {
    console.error('Failed to decode message:', err.message);
  }
});

ws.on('error', (err) => console.error('WebSocket error:', err));
ws.on('close', () => console.log('WebSocket closed'));
