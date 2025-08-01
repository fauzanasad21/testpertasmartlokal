const dbQuery = require('../config/db');

// Fungsi untuk mengambil batasan limit
const getLimit = async (req, res) => {
  try {
    const query = `
      SELECT * 
      FROM sensor_limits
    `;
    const result = await dbQuery(query);
    
    const results = result.map(item => ({
      data: item.data,
      upperlimit: item.upperlimit,
      bottomlimit: item.bottomlimit
    }));
  
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
};

// Fungsi untuk mengatur batasan limit
const setLimit = async (req, res) => {
  const { type, upperlimit, bottomlimit } = req.body;

  const allowedTypes = ['temperature', 'pressure', 'flow', 'dryness', 'power_potential', 'tesTemperature'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Tipe sensor tidak valid' });
  }

  if (upperlimit == null || bottomlimit == null) {
    return res.status(400).json({ error: 'upperlimit dan bottomlimit diperlukan' });
  }

  if (isNaN(upperlimit) || isNaN(bottomlimit)) {
    return res.status(400).json({ error: 'upperlimit dan bottomlimit harus berupa angka' });
  }

  if (upperlimit <= bottomlimit) {
    return res.status(400).json({ error: 'upperlimit harus lebih besar dari bottomlimit' });
  }

  try {
    const query = `
      INSERT INTO sensor_limits (data, upperlimit, bottomlimit)
      VALUES ($1, $2, $3)
      ON CONFLICT (data) DO UPDATE SET upperlimit = $2, bottomlimit = $3, timestamp = CURRENT_TIMESTAMP
    `;
    await dbQuery(query, [type, upperlimit, bottomlimit]);

    res.json({ message: 'Limits saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan data batas' });
  }
};

// Fungsi untuk mengambil data yang berada di luar batas
const outOfLimit = async (req, res) => {
  const { type, period } = req.query;

  const validTypes = ['flow', 'pressure', 'temperature', 'dryness', 'power'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  let intervalCondition;
  switch (period) {
    case 'daily':
      intervalCondition = "bucket >= NOW() - INTERVAL '1 DAY'";
      break;
    case 'monthly':
      intervalCondition = "bucket >= NOW() - INTERVAL '30 DAYS'";
      break;
    case 'yearly':
      intervalCondition = "bucket >= NOW() - INTERVAL '1 YEAR'";
      break;
    default:
      return res.status(400).json({ error: 'Invalid period parameter' });
  }

  try {
    const query = `
      SELECT SUM(out_of_limit_value) AS total_out_of_limit_time
      FROM aggregate_archive
      WHERE type = $1 
      AND ${intervalCondition}
    `;

    const result = await dbQuery(query, [type]);
    const totalOutOfLimitTime = result[0].total_out_of_limit_time || 0;

    res.json({
      type: type,
      totalOutOfLimitTime: `${totalOutOfLimitTime} seconds`,
      count: totalOutOfLimitTime
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};


module.exports = { getLimit, setLimit, outOfLimit };
