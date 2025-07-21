const dbQuery = require('../config/db');


const tableStatistics = async (req, res) => {
    const { type, period, page = 1, limit, month, year } = req.query;
    console.log('periodnya : ', period);
    console.log('typenya: ', type)
    const validTypes = {
        'flow': 'periodic_statistics_flow',
        'temperature': 'periodic_statistics_temperature',
        'pressure': 'periodic_statistics_pressure',
        'dryness': 'periodic_statistics_dryness',
        'power': 'periodic_statistics_power_potential'
    };

    if (!validTypes[type]) {
        return res.status(400).json({ error: 'Tipe data tidak valid' });
    }

    const validPeriods = ['daily', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
        return res.status(400).json({ error: 'Period parameter tidak valid' });
    }

    const table = validTypes[type];
    const offset = (page - 1) * limit;  // Offset untuk pagination

    let query = '';

    // Query untuk 'daily'
    if (period === 'daily') {
        query = `SELECT   record_time, min_value, max_value, avg_value, stddev_value, period
                 FROM ${table}
                 WHERE period = '${period}'
                 AND record_time >= NOW() - INTERVAL '3 years'`;

        // Jika tahun diberikan, filter berdasarkan tahun
        if (year) {
            query += ` AND EXTRACT(YEAR FROM record_time) = ${year}`;
        }

        // Jika bulan dan tahun diberikan, filter berdasarkan bulan dan tahun
        if (month && year) {
            query += ` AND EXTRACT(MONTH FROM record_time) = ${month}`;
        }
    }

    // Query untuk 'monthly'
    else if (period === 'monthly') {
        query = `SELECT   record_time, min_value, max_value, avg_value, stddev_value, period
                 FROM ${table}
                 WHERE period = '${period}'
                 AND record_time >= NOW() - INTERVAL '3 years'`;

        // Jika tahun diberikan, filter berdasarkan tahun
        if (year) {
            query += ` AND EXTRACT(YEAR FROM record_time) = ${year}`;
        }
    }

    // Query untuk 'yearly'
    else if (period === 'yearly') {
        query = `SELECT   record_time, min_value, max_value, avg_value, stddev_value, period
                 FROM ${table}
                 WHERE period = '${period}'
                 AND record_time >= NOW() - INTERVAL '3 years'`;
    }

    // Menambahkan limit dan offset untuk paginasi
    query += ` ORDER BY record_time DESC LIMIT ${limit} OFFSET ${offset}`;

    

    try {
        // Mendapatkan hasil query berdasarkan filter yang diterapkan
        const result = await dbQuery(query);
        if (result.length === 0) {
            return res.status(404).json({ message: 'Tidak ada data ditemukan untuk periode yang dipilih' });
        }

        // Query untuk mendapatkan jumlah total data yang berhasil diquery (menggunakan filter yang sama)
        let countQuery = `SELECT COUNT(*) as total FROM ${table}
                          WHERE period = '${period}'
                          AND record_time >= NOW() - INTERVAL '3 years'`;

        // Terapkan filter yang sama seperti query utama
        if (period === 'daily') {
            if (year) {
                countQuery += ` AND EXTRACT(YEAR FROM record_time) = ${year}`;
            }
            if (month && year) {
                countQuery += ` AND EXTRACT(MONTH FROM record_time) = ${month}`;
            }
        } else if (period === 'monthly') {
            if (year) {
                countQuery += ` AND EXTRACT(YEAR FROM record_time) = ${year}`;
            }
        } else if (period === 'yearly') {
            if (year) {
                countQuery += ` AND EXTRACT(YEAR FROM record_time) = ${year}`;
            }
        }

        const countResult = await dbQuery(countQuery);
        const totalRecords = countResult[0].total;
        console.log('SQL Query:', query);
        res.json({
            data: result,
            totalRecords: totalRecords,
            currentPage: parseInt(page),
            rowsPerPage: parseInt(limit),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data statistik' });
    }
};



const downloadTableStatistics = async (req, res) => {
    const { type, period, month, year } = req.query;

    const validTypes = {
        'flow': 'periodic_statistics_flow',
        'temperature': 'periodic_statistics_temperature',
        'pressure': 'periodic_statistics_pressure',
        'dryness': 'periodic_statistics_dryness',
        'power': 'periodic_statistics_power_potential'
    };

    if (!validTypes[type]) {
        return res.status(400).json({ error: 'Tipe data tidak valid' });
    }

    const validPeriods = ['daily', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
        return res.status(400).json({ error: 'Period parameter tidak valid, harus daily, monthly, atau yearly' });
    }

    const table = validTypes[type];

    // Query dasar
    let whereClause = `WHERE period = $1`;
    const queryParams = [period];

    // Tambahkan filter berdasarkan bulan dan tahun
    if (period === 'daily') {
        if (month && year) {
            whereClause += ` AND EXTRACT(MONTH FROM record_time) = $2 AND EXTRACT(YEAR FROM record_time) = $3`;
            queryParams.push(month, year);  // Tambahkan bulan dan tahun ke queryParams
        } else if (year) {
            whereClause += ` AND EXTRACT(YEAR FROM record_time) = $2`;
            queryParams.push(year);
        }
    } else if (period === 'monthly' && year) {
        whereClause += ` AND EXTRACT(YEAR FROM record_time) = $2`;
        queryParams.push(year);
    }

    // Batasi hingga 3 tahun terakhir
    if (['daily', 'monthly'].includes(period)) {
        whereClause += ` AND record_time >= NOW() - INTERVAL '3 years'`;
    }

    const query = `
        SELECT   
               record_time, 
               min_value, 
               max_value, 
               avg_value, 
               stddev_value, 
               period
        FROM ${table}
        ${whereClause}
        ORDER BY record_time DESC
    `;

    try {
        const result = await dbQuery(query, queryParams);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data' });
    }
};

module.exports = { tableStatistics, downloadTableStatistics };
