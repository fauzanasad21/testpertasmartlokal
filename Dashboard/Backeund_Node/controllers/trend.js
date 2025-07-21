const dbQuery = require('../config/db');
const ss = require('simple-statistics');


function getTrendStatus(slope) {
  if (slope > 0.01) {
    return 'naik';
  } else if (slope < -0.01) {
    return 'turun';
  } else {
    return 'stabil';
  }
}

const trend = async (req, res) => {
  const { type } = req.query;

  const validTypes = {
    'flow': 'flow',
    'pressure': 'pressure',
    'temperature': 'temperature',
    'dryness': 'dryness',
    'power_potential': 'power_potential'
  };

  const column = validTypes[type];
  if (!column) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  try {
    const queryNow = `
      SELECT timestamp, slope
      FROM recent_statistics
      WHERE period = 'month' AND data_name = $1
      ORDER BY timestamp DESC
    `;
    const result = await dbQuery(queryNow, [column]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'No data available' });
    }
    const latestSlope = result[0].slope;
    const trendStatus = getTrendStatus(latestSlope);
    return res.json({
      trendStatus: trendStatus,
      gradient: latestSlope
    });

  } catch (err) {
    console.error('Database query error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data' });
  }
};

const trendManual = async(req, res) => {
  try {
    const query123 = `      
      SELECT bucket, avg_value
      FROM flow_aggregate
      WHERE bucket >= time_bucket('10 minutes', NOW() - INTERVAL '1 hour');
      `
      console.log(query123);
      const result = await dbQuery(query123);  

      // Periksa apakah result.rows ada dan memiliki data
      if (result.length === 0) {
        console.log('No data found');
        return;
      }
      // Ambil data dari result.rows
      const timestamps = result.map(row => row.bucket);
      const avgValues = result.map(row => row.avg_value);
  
      // Ubah timestamps menjadi epoch time (detik sejak 1970)
      const epochTimes = timestamps.map(ts => new Date(ts).getTime() / 1000); // Dalam detik
  
      // Hitung slope dengan menggunakan simple-statistics
      const n = epochTimes.length;
      const sumX = epochTimes.reduce((a, b) => a + b, 0);
      const sumY = avgValues.reduce((a, b) => a + b, 0);
      const sumXY = epochTimes.reduce((acc, val, idx) => acc + (val * avgValues[idx]), 0);
      const sumX2 = epochTimes.reduce((acc, val) => acc + (val * val), 0);
  
      // Hitung slope (kemiringan) dan intercept
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const trendStatus = getTrendStatus(slope);
  
      return res.json({
        data: avgValues,
        gradient: slope,
        intercep: intercept,
        status: trendStatus
      });
    } catch (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Gagal mengambil data' });
    }
  };



module.exports = {trend, trendManual};
