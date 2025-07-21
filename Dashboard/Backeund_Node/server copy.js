



const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const axios = require('axios');
const ss = require('simple-statistics');

const redis = require('redis');
const redisClient = redis.createClient();

const app = express();
const port =  9921;

app.use(cors());
app.use(express.json());
let latestDataFromPython = null;



const pool = mysql.createPool({
  host: 'localhost',
  user: 'unpad',
  password: '@Jatinangor1',  
  database: 'monitoring_steam_dryness',
  waitForConnections: true,
  connectionLimit: 10, // Limit jumlah koneksi simultan
  queueLimit: 0 // Tidak ada limit untuk antrean koneksi
});


// db.connect((err) => {
//   if (err) {
//     console.error('Koneksi ke MySQL gagal:', err);
//   } else {
//     console.log('Terhubung ke MySQL');
//   }
// });

const dbQuery = (query, values) => {
  return new Promise((resolve, reject) => {
    pool.query(query, values, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

app.get('http://localhost:9921/api/getLimit', async (req, res) => {
  try{
    const query = `
    SELECT * 
    FROM limit_settings

  `;
  const result = await dbQuery(query);
  

  const results = result.map(item => ({
    data: item.data,
    batasAtas: item.batasAtas,
    batasBawah: item.batasBawah
  }));

  res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
})
app.get('http://localhost:9921/api/NewDataReal', async (req, res) => {
  try{
    const query = `
    SELECT * 
    FROM real_time_data
    ORDER BY timestamp DESC 
    LIMIT 30
  `;

  const result = await dbQuery(query);
  
  const convertToLocalTime = (utcTimestamp) => {
    const datetime = new Date(utcTimestamp);
    return new Date(datetime.getTime() - (datetime.getTimezoneOffset() * 60000)).toISOString();
  };

  // Formatkan data seperti yang ada di worker provider
  const formattedData = {
    temperature: { data: [] },
    pressure: { data: [] },
    flow: { data: [] },
    dryness: { data: [] },
    power: { data: [] },
  };

  result.forEach((row) => {
    const localTimestamp = convertToLocalTime(row.timestamp);
    
    formattedData.temperature.data.push({ x: localTimestamp, y: row.temperature });
    formattedData.pressure.data.push({ x: localTimestamp, y: row.pressure });
    formattedData.flow.data.push({ x: localTimestamp, y: row.flow });
    formattedData.dryness.data.push({ x: localTimestamp, y: row.dryness });
    formattedData.power.data.push({ x: localTimestamp, y: row.power_prediction });
  });
  
  res.json(formattedData);



  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }

});

app.get('http://localhost:9921/api/dataGrafik', async (req, res) => {
  const { type, startDate, endDate, page, limit, aggregationInterval } = req.query;

  let column = '';
  switch(type) {
    case 'dryness' : column = 'dryness'; break;
    case 'temperature': column = 'temperature'; break;
    case 'pressure': column = 'pressure'; break;
    case 'flow': column = 'flow'; break;
    case 'power': column = 'power_prediction'; break;
    default: column = 'temperature'; 
  }

  // Default pagination params
  const limitValue = parseInt(limit) || 1000;  // Batas per halaman (default 1000)
  const offset = (parseInt(page) - 1) * limitValue;  // Menghitung offset
  const interval = aggregationInterval || '10m';  // Interval agregasi (default 10 menit)

  try {
    let query = '';

    if (startDate && endDate) {
      // Query dengan agregasi dan pagination
      query = `
        SELECT 
          DATE_FORMAT(CONVERT_TZ(timestamp, '+00:00', '+00:00'), '%Y-%m-%d %H:%i:00') AS aggregated_time, 
          AVG(${column}) AS value 
        FROM real_time_data 
        WHERE timestamp BETWEEN ? AND ? 
        GROUP BY aggregated_time 
        ORDER BY aggregated_time ASC
        LIMIT ? OFFSET ?`;

      const result = await dbQuery(query, [startDate, endDate, limitValue, offset]);

      // Jika ada data, hitung statistiknya
      if (result.length > 0) {
        const values = result.map(item => item.value);  // Ambil nilai 'value' dari hasil query

        const statistics = calculateStatistics(values);  // Hitung statistik

        // Gabungkan statistik ke dalam setiap objek data
        const combinedResult = result.map(item => ({
          ...item,
          ...statistics  // Gabungkan statistik ke setiap item
        }));

        res.json(combinedResult);
      } else {
        res.json([]);  // Jika tidak ada data
      }

    } else {
      query = `SELECT timestamp, ${column} AS value FROM real_time_data 
               ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
      const result = await dbQuery(query, [limitValue, offset]);

      if (result.length > 0) {
        const values = result.map(item => item.value);  // Ambil nilai 'value' dari hasil query

        const statistics = calculateStatistics(values);  // Hitung statistik

        // Gabungkan statistik ke dalam setiap objek data
        const combinedResult = result.reverse().map(item => ({
          ...item,
          ...statistics  // Gabungkan statistik ke setiap item
        }));

        res.json(combinedResult);
      } else {
        res.json([]);
      }
    }

  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});

// Fungsi untuk menghitung statistik: rata-rata, minimal, maksimal, dan standar deviasi
function calculateStatistics(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Hitung standar deviasi
  const variance = values.reduce((variance, value) => variance + Math.pow(value - average, 2), 0) / values.length;
  const stdDeviation = Math.sqrt(variance);

  return {
    average: average,
    min: min,
    max: max,
    stdDeviation: stdDeviation
  };
}


app.get('http://localhost:9921/api/history/all', async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const query = `
      SELECT 
        timestamp, 
        flow, 
        pressure, 
        temperature, 
        dryness AS steam_dryness, 
        power_prediction
      FROM real_time_data 
      WHERE timestamp BETWEEN ? AND ?
    `;
    const result = await dbQuery(query, [startDate, endDate]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});


app.get('http://localhost:9921/api/history', async (req, res) => {
  const { startDate, endDate, page = 1 } = req.query;

  const limit = 20;


  const parsedPage = parseInt(page, 10);
  const offset = (parsedPage - 1) * limit;

  try {

      const countQuery = `
          SELECT COUNT(*) as totalRecords 
          FROM real_time_data 
          WHERE timestamp BETWEEN ? AND ?;
      `;
      const countResult = await dbQuery(countQuery, [startDate, endDate]);
      const totalRecords = countResult[0].totalRecords;
      const totalPages = Math.ceil(totalRecords / limit);


      const query = `
          SELECT timestamp, temperature, pressure, flow, dryness, power_prediction 
          FROM real_time_data 
          WHERE timestamp BETWEEN ? AND ? 
          ORDER BY timestamp ASC 
          LIMIT ? OFFSET ?;
      `;
      const result = await dbQuery(query, [startDate, endDate, limit, offset]);

      // Send response with pagination metadata
      res.json({
          data: result,
          currentPage: parsedPage,
          totalPages: totalPages,
          totalRecords: totalRecords,
      });
  } catch (err) {
      res.status(500).json({ error: 'Gagal mengambil data' });
  }
});



app.get('http://localhost:9921/api/dataCalibration', async(req, res) => {
  try {
    const query = `SELECT sensor_type, min_value, max_value FROM sensor_calibration`
    const result = await dbQuery(query);
    res.json(result.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});

app.get('http://localhost:9921/api/random-data', (req,res) => {
    const random = {
        temperature: (Math.random() * (100 - 20) + 20).toFixed(2),
        pressure: (Math.random() * (10 - 1) + 1).toFixed(2),
        flow: (Math.random() * (1000 - 100) + 100).toFixed(2),
        energi: (Math.random() * (500 - 50) + 50).toFixed(2),
        dryness_steam: (Math.random() * (100 - 70) + 70).toFixed(2),
    }
    
    res.json(random)
});

app.post('http://localhost:9921/api/receive-data', async (req, res) => {
  const { flow, pressure, temperature, dryness, power_prediction } = req.body;

  if (!flow || !pressure || !temperature || !dryness || !power_prediction) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  latestDataFromPython = { flow, pressure, temperature, dryness, power_prediction };

  console.log('Data diterima:', latestDataFromPython);

  res.status(200).json({ message: 'Data berhasil diterima' });
});

app.get('http://localhost:9921/api/dataRealtime', async (req, res) => {
  if (!latestDataFromPython) {
    return res.status(404).json({ error: 'Data belum tersedia' });
  }

  try {
    const query = 'SELECT data, batasAtas, batasBawah FROM limit_settings';
    const limits = await dbQuery(query); // Menjalankan query tanpa callback

    // Menyusun pengaturan batas dari hasil query
    const limitSettings = {};
    limits.forEach(limit => {
      limitSettings[limit.data] = {
        batasAtas: limit.batasAtas,
        batasBawah: limit.batasBawah
      };
    });

    // Fungsi untuk mengecek apakah data melampaui batas
    const checkLimit = (value, limit) => {
      if (value > limit.batasAtas || value < limit.batasBawah) {
        return 1; // Melebihi batas
      } else {
        return 0; // Aman
      }
    };

    // Menghitung status data berdasarkan batas yang ada
    const response = {
      flow: {
        data: latestDataFromPython.flow,
        status: checkLimit(latestDataFromPython.flow, limitSettings.flow)
      },
      pressure: {
        data: latestDataFromPython.pressure,
        status: checkLimit(latestDataFromPython.pressure, limitSettings.pressure)
      },
      temperature: {
        data: latestDataFromPython.temperature,
        status: checkLimit(latestDataFromPython.temperature, limitSettings.temperature)
      },
      dryness: {
        data: latestDataFromPython.dryness,
        status: checkLimit(latestDataFromPython.dryness, limitSettings.dryness)
      },
      power: {
        data: latestDataFromPython.power_prediction,
        status: checkLimit(latestDataFromPython.power_prediction, limitSettings.power_prediction)
      }
    };

    // Mengirimkan respons JSON
    res.status(200).json(response);

  } catch (err) {
    // Menangani error jika terjadi masalah dengan query atau pengolahan data
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});



// Endpoint API yang dimodifikasi
function convertOutOfLimitCount(outOfLimitCount) {
  // Asumsinya adalah data diterima setiap 5 detik, jadi kita konversikan jumlah hitungan ke waktu
  const totalSecondsOut = outOfLimitCount * 5;
  const hours = Math.floor(totalSecondsOut / 3600);
  const minutes = Math.floor((totalSecondsOut % 3600) / 60);
  const seconds = totalSecondsOut % 60;

  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds
  };
}

function getTrendStatus(slope) {
  if (slope > 0.01) {
    return 'naik'; // Tren naik
  } else if (slope < -0.01) {
    return 'turun'; // Tren turun
  } else {
    return 'stabil'; // Tren stabil
  }
}

// Endpoint API yang dimodifikasi
app.get('http://localhost:9921/api/statistics', async (req, res) => {
  const { period, type } = req.query;

  // Validasi parameter 'type' yang diterima
  let column = '';
  switch (type) {
    case 'flow':
      column = 'flow';
      break;
    case 'pressure':
      column = 'pressure';
      break;
    case 'temperature':
      column = 'temperature';
      break;
    case 'dryness':
      column = 'dryness';
      break;
    case 'power':
      column = 'power_prediction';
      break;
    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }

  // Validasi parameter 'period' yang diterima
  if (!['now', 'daily', 'monthly', 'yearly'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period parameter' });
  }

  try {
    // Query untuk mengambil data dari tabel `statistics_summary`
    let query = `
      SELECT 
        min_value AS min_${column}, 
        max_value AS max_${column}, 
        avg_value AS avg_${column}, 
        stddev_value AS stddev_${column}, 
        gradient, 
        out_of_limit_count 
      FROM statistics_summary
      WHERE data_type = ? AND period = ?;
    `;

    // Jalankan query dengan parameter 'type' dan 'period'
    const result = await dbQuery(query, [type, period]);

    // Jika tidak ada hasil, kembalikan pesan error
    if (result.length === 0) {
      return res.status(404).json({ message: 'No data available' });
    }

    // Ambil hasil query
    const responseData = result[0];

    // Tentukan status tren berdasarkan gradien
    const trendStatus = getTrendStatus(responseData.gradient);

    // Konversi out_of_limit_count ke jam, menit, detik
    const outOfLimitDuration = convertOutOfLimitCount(responseData.out_of_limit_count);

    // Tambahkan status tren dan durasi out of limit ke response
    res.json({
      ...responseData,
      trend_status: trendStatus, // Status tren ('naik', 'turun', 'stabil')
      out_of_limit_duration: outOfLimitDuration // Durasi berapa lama data di luar limit (jam, menit, detik)
    });

  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});



app.get('http://localhost:9921/api/statisticsGraph', async (req, res) => {
  const { type, period } = req.query;

  // Memastikan type yang valid
  const validTypes = ['flow', 'pressure', 'temperature', 'dryness', 'power'];
  const validPeriods = ['daily', 'monthly', 'yearly'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: 'Invalid period parameter' });
  }

  // Menentukan tabel berdasarkan type
  let table = '';
  switch (type) {
    case 'flow': table = 'flow_statistics'; break;
    case 'pressure': table = 'pressure_statistics'; break;
    case 'temperature': table = 'temperature_statistics'; break;
    case 'dryness': table = 'steam_quality_statistics'; break;
    case 'power': table = 'power_prediction_statistics'; break;
  }

  // Menentukan period_condition berdasarkan periode
  const periodCondition = "period_type = ?";  // Menggunakan parameterized query

  try {
    const query = `
      SELECT timestamp, min_value, max_value, avg_value, stddev_value 
      FROM ${table} 
      WHERE ${periodCondition}
      ORDER BY timestamp DESC;
    `;

    // Eksekusi query dengan parameter period (untuk menghindari SQL injection)
    const result = await dbQuery(query, [period]);
    res.json(result);

  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});


// Fungsi untuk menghitung tren berdasarkan data
function calculateTrend(data) {
  const points = data.map((d, index) => [index, d.value]);
  const regression = ss.linearRegression(points);
  return regression.m;  // Mengembalikan kemiringan (slope) dari regresi linear
}



app.get('http://localhost:9921/api/trend', async (req, res) => {
  const { type, period } = req.query;

  // Validasi parameter 'type'
  let column = '';
  switch (type) {
    case 'flow': column = 'flow'; break;
    case 'pressure': column = 'pressure'; break;
    case 'temperature': column = 'temperature'; break;
    case 'dryness': column = 'dryness'; break;
    case 'power': column = 'power_prediction'; break;
    default:
      return res.status(400).json({ error: 'Invalid type parameter' });
  }

  if (period === 'now') {
    try {
      // Query untuk mengambil 100 data terbaru
      const queryNow = `
        SELECT timestamp, ${column} AS value
        FROM real_time_data
        ORDER BY timestamp DESC
        LIMIT 100
      `;

      const result = await dbQuery(queryNow);  // Menjalankan query tanpa parameter tambahan
      if (result.length === 0) {
        return res.status(404).json({ error: 'No data available' });
      }

      // Menghitung slope dan status tren
      const slope = calculateTrend(result);
      const trendStatus = getTrendStatus(slope);

      return res.json({
        trendStatus: trendStatus,
        gradient: slope  // Mengembalikan slope/kemiringan
      });

    } catch (err) {
      return res.status(500).json({ error: 'Gagal mengambil data' });
    }
  } else {
    // Menentukan format tanggal dan batas limit untuk periode
    let dateFormat = '';
    let limit = 30;
    if (period === 'daily') {
      dateFormat = '%Y-%m-%d';
    } else if (period === 'monthly') {
      dateFormat = '%Y-%m';
      limit = 12;  // Membatasi 12 bulan terakhir
    } else if (period === 'yearly') {
      dateFormat = '%Y';
      limit = 5;  // Membatasi 5 tahun terakhir
    } else {
      return res.status(400).json({ error: 'Invalid period parameter' });
    }

    try {
      // Query untuk mengambil rata-rata per periode
      const query = `
        SELECT DATE_FORMAT(timestamp, '${dateFormat}') AS date, AVG(${column}) AS value
        FROM real_time_data
        GROUP BY date
        ORDER BY date DESC
        LIMIT ${limit}
      `;

      const result = await dbQuery(query);  // Menjalankan query tanpa parameter tambahan
      if (result.length === 0) {
        return res.status(404).json({ error: 'No data available' });
      }

      // Menghitung slope dan status tren
      const slope = calculateTrend(result);
      const trendStatus = getTrendStatus(slope);

      return res.json({
        trendStatus: trendStatus,
        gradient: slope  // Mengembalikan slope/kemiringan
      });

    } catch (err) {
      return res.status(500).json({ error: 'Gagal mengambil data' });
    }
  }
});


app.post('http://localhost:9921/api/setLimit', async (req, res) => {
  const { type, batasAtas, batasBawah } = req.body;
  
  // Validasi tipe data
  const allowedtypes = ['temperature', 'pressure', 'flow', 'dryness', 'power_prediction'];
  if (!allowedtypes.includes(type)) {
    return res.status(400).json({ error: 'Tipe sensor tidak valid' });
  }

  // Validasi data yang masuk
  if (batasAtas == null || batasBawah == null) {
    return res.status(400).json({ error: 'batasAtas dan batasBawah diperlukan' });
  }

  if (isNaN(batasAtas) || isNaN(batasBawah)) {
    return res.status(400).json({ error: 'batasAtas dan batasBawah harus berupa angka' });
  }

  // Validasi logis untuk batas
  if (batasAtas <= batasBawah) {
    return res.status(400).json({ error: 'batasAtas harus lebih besar dari batasBawah' });
  }

  try {
    // Query untuk menyimpan atau memperbarui data batas
    const query = `
      INSERT INTO limit_settings (data, batasAtas, batasBawah)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE batasAtas = ?, batasBawah = ?, timestamp = CURRENT_TIMESTAMP
    `;

    const result = await dbQuery(query, [type, batasAtas, batasBawah, batasAtas, batasBawah]);

    res.json({ message: 'Limits saved successfully' });
  } catch (err) {
    // Menangani kesalahan query atau database
    res.status(500).json({ error: 'Gagal menyimpan data batas' });
  }
});


app.get('http://localhost:9921/api/outOfLimit', async (req, res) => {
  const { type, period } = req.query;

  // Validasi parameter type
  const validTypes = ['flow', 'pressure', 'temperature', 'dryness', 'power'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  // Query untuk mendapatkan batas atas dan batas bawah dari limit_settings
  const limitQuery = `SELECT batasAtas, batasBawah FROM limit_settings WHERE data = ?`;

  try {
    // Eksekusi query untuk mendapatkan batasan
    const limits = await dbQuery(limitQuery, [type]);
    if (limits.length === 0) {
      return res.status(404).json({ error: 'No limits found for the given type' });
    }

    const { batasAtas, batasBawah } = limits[0];

    // Menentukan kondisi waktu berdasarkan periode
    let interval = '';
    switch (period) {
      case 'daily':
        interval = '1 DAY';
        break;
      case 'monthly':
        interval = '30 DAY';
        break;
      case 'yearly':
        interval = '12 MONTH';
        break;
      default:
        return res.status(400).json({ error: 'Invalid period parameter' });
    }

    // Query untuk menghitung jumlah data yang berada di luar batas
    const query = `
      SELECT COUNT(*) AS count
      FROM real_time_data
      WHERE (${type} < ? OR ${type} > ?)
      AND timestamp >= NOW() - INTERVAL ${interval}
    `;

    // Eksekusi query
    const result = await dbQuery(query, [batasBawah, batasAtas]);

    // Jika ada hasil, kembalikan hasilnya
    const count = result[0].count;
    const timeExceeded = `${count} hours`;

    res.json({
      type: type,
      timeExceeded: timeExceeded,
      count: count
    });

  } catch (err) {
    // Tangani kesalahan dengan respon error yang jelas
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});


app.get('http://localhost:9921/api/tableStatistics', async (req, res) => {
  const { type, period, page = 1, limit = 10 } = req.query;

  const validTypes = {
    'flow': 'flow_statistics',
    'temperature': 'temperature_statistics',
    'pressure': 'pressure_statistics',
    'dryness': 'steam_quality_statistics',
    'power': 'power_prediction_statistics'
  };

  if (!validTypes[type]) {
    return res.status(400).json({ error: 'Tipe data tidak valid' });
  }

  const validPeriods = ['daily', 'monthly', 'yearly'];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: 'Period parameter tidak valid, harus daily, monthly, atau yearly' });
  }

  const table = validTypes[type];
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) as total FROM ${table} WHERE period_type = ?`;
  const dataQuery = `
    SELECT id, 
           timestamp, 
           min_value, 
           max_value, 
           avg_value, 
           stddev_value, 
           period_type
    FROM ${table}
    WHERE period_type = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;

  try {
    const countResult = await dbQuery(countQuery, [period]);
    const totalRecords = countResult[0].total;

    const dataResults = await dbQuery(dataQuery, [period, parseInt(limit), parseInt(offset)]);

    if (dataResults.length === 0) {
      return res.status(404).json({ message: 'Tidak ada data ditemukan untuk periode yang dipilih' });
    }

    res.json({
      data: dataResults,
      totalRecords: totalRecords,
      currentPage: parseInt(page),
      rowsPerPage: parseInt(limit),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data statistik' });
  }
});


app.get('http://localhost:9921/api/tableStatistics/all', async (req, res) => {
  const {type,period} = req.query;

  const validTypes = {
    'flow': 'flow_statistics',
    'temperature': 'temperature_statistics',
    'pressure': 'pressure_statistics',
    'dryness': 'steam_quality_statistics',
    'power': 'power_prediction_statistics'
  };

  if (!validTypes[type]) {
    return res.status(400).json({ error: 'Tipe data tidak valid' });
  }

  const validPeriods = ['daily', 'monthly', 'yearly'];
  if (!validPeriods.includes(period)) {
    return res.status(400).json({ error: 'Period parameter tidak valid, harus daily, monthly, atau yearly' });
  }

  const table = validTypes[type];
  try {
    const query = `
    SELECT id, 
           timestamp, 
           min_value, 
           max_value, 
           avg_value, 
           stddev_value, 
           period_type
    FROM ${table}
    WHERE period_type = ?
    ORDER BY timestamp DESC
    `;
    console.log(query)
    const result = await dbQuery(query, [period]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});


app.post('http://localhost:9921/api/setCalibration', async (req, res) => {
  const { sensorType, minValue, maxValue } = req.body;

  // Validasi tipe sensor
  const allowedSensorTypes = ['temperature', 'pressure', 'flow'];
  if (!allowedSensorTypes.includes(sensorType)) {
    return res.status(400).json({ error: 'Tipe sensor tidak valid' });
  }

  // Validasi nilai kalibrasi
  if (minValue == null || maxValue == null) {
    return res.status(400).json({ error: 'minValue dan maxValue harus disediakan' });
  }

  if (isNaN(minValue) || isNaN(maxValue)) {
    return res.status(400).json({ error: 'minValue dan maxValue harus berupa angka' });
  }

  // Validasi logika minValue dan maxValue
  if (minValue >= maxValue) {
    return res.status(400).json({ error: 'minValue harus lebih kecil dari maxValue' });
  }

  try {
    // Query untuk menyimpan kalibrasi
    const query = `
      INSERT INTO sensor_calibration (sensor_type, min_value, max_value)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE min_value = ?, max_value = ?, updated_at = CURRENT_TIMESTAMP
    `;

    // Menjalankan query
    await dbQuery(query, [sensorType, minValue, maxValue, minValue, maxValue]);

    // Data kalibrasi yang akan dikirim ke Python
    const calibrationData = {
      sensor_type: sensorType,
      min_value: minValue,
      max_value: maxValue
    };

    // Mengirim data kalibrasi ke service Python
    const pythonUrl = 'http://localhost:9922http://localhost:9921/api/receive-calibration';
    
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
});



app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
