const dbQuery = require('../config/db');
const ss = require('simple-statistics');

function calculateStatistics(data) {
  const avgValues = data.map(item => item.avg_value);
  const minValues = data.map(item => item.min_value);
  const maxValues = data.map(item => item.max_value);
  const stddevValues = data.map(item => item.stddev_value);
  const outOfLimitValues = data.map(item => item.out_of_limit_value);
  const slopeValues = data.map(item => item.slope_value);

  // Menghitung slope menggunakan regresi linier
  const timeValues = data.map((item, index) => index); // Menggunakan indeks sebagai waktu jika data sudah teragregasi
  const trend = calculateSlope(timeValues, avgValues); // Mendapatkan nilai slope dari regresi linier

  const avg = ss.mean(avgValues);
  const min = Math.min(...minValues);
  const max = Math.max(...maxValues);
  const stddev = ss.standardDeviation(stddevValues);
  const totalOutOfLimit = outOfLimitValues.reduce((sum, value) => sum + value, 0);
  

  return {
    avg,
    min,
    max,
    stddev,
    totalOutOfLimit,
    trend
  };
}

function calculateSlope(xValues, yValues) {
  const n = xValues.length;

  // Menghitung jumlah x, y, x*y, dan x^2
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
    sumXY += xValues[i] * yValues[i];
    sumX2 += xValues[i] * xValues[i];
  }

  // Menghitung slope (m)
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Menghitung intercept (b)
  const b = (sumY - m * sumX) / n;

  return  m;
}

const dataGrafik = async (req, res) => {
  const { type, startDate, endDate } = req.query;

  // Validasi jenis data
  const allowedTypes = ['dryness', 'temperature', 'power', 'flow', 'pressure'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Jenis data tidak valid' });
  }

  try {
    const query = `
    SELECT bucket, avg_value, min_value, max_value, stddev_value, out_of_limit_value
    FROM aggregate_archive
    WHERE type = $1 
    AND bucket BETWEEN $2::timestamp AND $3::timestamp
    ORDER BY bucket ASC
  `;
  

    const result = await dbQuery(query, [type, startDate, endDate]);

    if (result.length > 0) {
      // Menghitung statistik berdasarkan data yang diambil dari tabel archive
      const statistics = calculateStatistics(result);

      // Mengubah format data untuk menyesuaikan format { x: bucket, y: avg_value }
      const formattedData = result.map(item => ({
        x: item.bucket,
        y: item.avg_value
      }));

      res.json({
        statistics,
        data: formattedData
      });
    } else {
      res.json({ statistics: {}, data: [] });
    }

  } catch (err) {
    console.error('Gagal mengambil data:', err);
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
};

module.exports = dataGrafik;
