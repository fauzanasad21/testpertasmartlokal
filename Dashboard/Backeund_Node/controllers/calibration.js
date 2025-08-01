const dbQuery = require('../config/db');
const axios = require('axios');

const getCalibration = async (req, res) => {
  try {
    const query = `SELECT sensor_type, min_value, max_value FROM sensor_calibration`;
    const result = await dbQuery(query);
    res.json(result.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
};

const setCalibration = async (req, res) => {
  const { sensorType, minValue, maxValue } = req.body;

  const allowedSensorTypes = ['temperature', 'pressure', 'flow', 'tesTemperature'];
  if (!allowedSensorTypes.includes(sensorType)) {
    return res.status(400).json({ error: 'Tipe sensor tidak valid' });
  }

  if (minValue == null || maxValue == null) {
    return res.status(400).json({ error: 'minValue dan maxValue harus disediakan' });
  }

  if (isNaN(minValue) || isNaN(maxValue)) {
    return res.status(400).json({ error: 'minValue dan maxValue harus berupa angka' });
  }

  if (minValue >= maxValue) {
    return res.status(400).json({ error: 'minValue harus lebih kecil dari maxValue' });
  }

  try {
    const query = `
      INSERT INTO sensor_calibration (sensor_type, min_value, max_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (sensor_type) DO UPDATE 
      SET min_value = $2, max_value = $3, updated_at = CURRENT_TIMESTAMP
    `;

    await dbQuery(query, [sensorType, minValue, maxValue]);

    const calibrationData = {
      sensor_type: sensorType,
      min_value: minValue,
      max_value: maxValue
    };

    // const pythonUrl = 'http://localhost:9922http://localhost:9921/api/receive-calibration';
    const pythonUrl = 'http://localhost:9922http://localhost:9921/api/tesReceive-calibration';
    try {
      const response = await axios.post(pythonUrl, calibrationData);
      console.log('Kalibrasi berhasil dikirim ke Python:', response.data);
      res.status(200).json({ message: 'Kalibrasi berhasil disimpan dan dikirim ke Python' });
    } catch (error) {
      console.error('Gagal mengirim kalibrasi ke Python:', error);
      res.status(500).json({ error: 'Kalibrasi berhasil disimpan, tapi gagal dikirim ke Python' });
    }

  } catch (err) {
    console.error('Gagal menyimpan kalibrasi:', err);
    res.status(500).json({ error: 'Gagal menyimpan kalibrasi' });
  }
};

module.exports = { getCalibration, setCalibration };
