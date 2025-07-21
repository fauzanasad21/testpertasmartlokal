require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  max: 200, // Kurangi jumlah koneksi maksimal
  idleTimeoutMillis: 60000, // Idle timeout lebih panjang
  connectionTimeoutMillis: 5000, // Beri waktu lebih lama untuk koneksi
});


const dbQuery = async (query, values) => {
  const client = await pool.connect();
  try {
      const results = await client.query(query, values);
      return results.rows;
  } catch (err) {
      throw err;
  } finally {
      client.release(); // Pastikan koneksi dilepaskan
      console.log('Database connection released');
  }
};



module.exports = dbQuery;
