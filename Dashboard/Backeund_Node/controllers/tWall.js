const dbQuery = require('../config/db'); // Asumsi koneksi database
const axios = require('axios');

// Endpoint untuk mengambil data kalibrasi (tabel dengan kolom Twall dan timestamp)
const getTwall = async (req, res) => {
  try {
    const query = `SELECT twall, timestamp FROM tWall WHERE id = 1`;
    const result = await dbQuery(query);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
};

// Endpoint untuk menyimpan atau mengupdate nilai Twall
const setTwall = async (req, res) => {
  const { Twall } = req.body;

  // Validasi input
  if (!Twall) {
    return res.status(400).json({ error: 'Twall harus disediakan' });
  }

  try {
    const query = `
      INSERT INTO tWall (id, Twall, timestamp)
      VALUES (1, $1, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE
      SET Twall = $1, timestamp = CURRENT_TIMESTAMP
    `;
    
    // Menyimpan atau mengganti nilai Twall
    await dbQuery(query, [Twall]);

    // Jika perlu mengirimkan data ke API lain (misalnya Python service)
    const pythonUrl = 'http://localhost:9922http://localhost:9921/api/receive-twall';

    try {
      const response = await axios.post(pythonUrl, { Twall });
      console.log('Twall berhasil dikirim ke Python:', response.data);
      res.status(200).json({ message: 'Twall berhasil disimpan dan dikirim ke Python' });
    } catch (error) {
      console.error('Gagal mengirim Twall ke Python:', error);
      res.status(500).json({ error: 'Twall berhasil disimpan, tapi gagal dikirim ke Python' });
    }
    
  } catch (err) {
    console.error('Gagal menyimpan Twall:', err);
    res.status(500).json({ error: 'Gagal menyimpan Twall' });
  }
};

module.exports = { getTwall, setTwall };
