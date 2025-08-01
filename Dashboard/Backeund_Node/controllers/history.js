const dbQuery = require('../config/db');

// Fungsi untuk download data history tanpa paginasi
const downloadHistory = async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const query = `
            SELECT 
                bucket AS date, 
                AVG(CASE WHEN type = 'flow' THEN avg_value END) AS flow, 
                AVG(CASE WHEN type = 'temperature' THEN avg_value END) AS temperature, 
                AVG(CASE WHEN type = 'pressure' THEN avg_value END) AS pressure, 
                AVG(CASE WHEN type = 'dryness' THEN avg_value END) AS dryness, 
                AVG(CASE WHEN type = 'power' THEN avg_value END) AS power_potential
            FROM aggregate_archive 
            WHERE bucket BETWEEN $1 AND $2
            GROUP BY bucket
            ORDER BY bucket ASC;
        `;
        const result = await dbQuery(query, [startDate, endDate]);

        // Format hasil agar sesuai dengan yang diinginkan
        const formattedResult = result.map(item => ({
            date: item.date,
            flow: item.flow,
            temperature: item.temperature,
            pressure: item.pressure,
            dryness: item.dryness,
            power_potential: item.power_potential
        }));

        res.json(formattedResult);
    } catch (err) {
        console.error('Gagal mengambil data:', err);
        res.status(500).json({ error: 'Gagal mengambil data' });
    }
};

// Fungsi untuk mengambil data history dengan paginasi
const history = async (req, res) => {
    const { startDate, endDate, page = 1 } = req.query;

    const limit = 20;
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * limit;

    try {
        // Menghitung jumlah total records
        const countQuery = `
            SELECT COUNT(DISTINCT bucket) AS totalRecords 
            FROM aggregate_archive 
            WHERE bucket BETWEEN $1 AND $2;
        `;
        const countResult = await dbQuery(countQuery, [startDate, endDate]);
        const totalRecords = countResult[0].totalrecords;
        const totalPages = Math.ceil(totalRecords / limit);

        // Mengambil data dengan limit dan offset untuk paginasi
        const query = `
            SELECT 
                bucket AS date, 
                AVG(CASE WHEN type = 'flow' THEN avg_value END) AS flow, 
                AVG(CASE WHEN type = 'temperature' THEN avg_value END) AS temperature, 
                AVG(CASE WHEN type = 'pressure' THEN avg_value END) AS pressure, 
                AVG(CASE WHEN type = 'dryness' THEN avg_value END) AS dryness, 
                AVG(CASE WHEN type = 'power' THEN avg_value END) AS power_potential
            FROM aggregate_archive 
            WHERE bucket BETWEEN $1 AND $2
            GROUP BY bucket
            ORDER BY bucket ASC
            LIMIT $3 OFFSET $4;
        `;
        const result = await dbQuery(query, [startDate, endDate, limit, offset]);

        // Format hasil agar sesuai dengan yang diinginkan
        const formattedResult = result.map(item => ({
            date: item.date,
            flow: item.flow,
            temperature: item.temperature,
            pressure: item.pressure,
            dryness: item.dryness,
            power_potential: item.power_potential
        }));

        res.json({
            data: formattedResult,
            currentPage: parsedPage,
            totalPages: totalPages,
            totalRecords: totalRecords,
        });
    } catch (err) {
        console.error('Gagal mengambil data:', err);
        res.status(500).json({ error: 'Gagal mengambil data' });
    }
};

module.exports = { history, downloadHistory };
