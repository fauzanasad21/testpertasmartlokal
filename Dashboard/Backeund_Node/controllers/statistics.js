const dbQuery = require('../config/db');

function convertOutOfLimitCount(outOfLimitCount) {
    const totalSecondsOut = outOfLimitCount * 1;
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
        return 'naik';
    } else if (slope < -0.01) {
        return 'turun';
    } else {
        return 'stabil';
    }
}

const getStatistics = async (req, res) => {
    const { period, type } = req.query;

    const validTypes = ['flow', 'pressure', 'temperature', 'dryness', 'power_potential'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (!['now', 'day', 'month', 'year'].includes(period)) {
        return res.status(400).json({ error: 'Invalid period parameter' });
    }

    try {
        const query = `
            SELECT 
                min_value AS min_${type}, 
                max_value AS max_${type}, 
                avg_value AS avg_${type}, 
                stddev_value AS stddev_${type}, 
                slope AS gradient, 
                out_of_limit_count 
            FROM recent_statistics
            WHERE data_name = $1 AND period = $2;
        `;

        const result = await dbQuery(query, [type, period]);

        if (result.length === 0) {
            return res.status(404).json({ message: 'No data available' });
        }

        const responseData = result[0];
        const trendStatus = getTrendStatus(responseData.gradient);
        const outOfLimitDuration = convertOutOfLimitCount(responseData.out_of_limit_count);

        res.json({
            ...responseData,
            trend_status: trendStatus,
            out_of_limit_duration: outOfLimitDuration
        });

    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
};

const getGraphStatistics = async (req, res) => {
    const { type, period, month, year } = req.query;

    const validTypes = ['flow', 'pressure', 'temperature', 'dryness', 'power'];
    const validPeriods = ['daily', 'monthly', 'yearly'];

    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (!validPeriods.includes(period)) {
        return res.status(400).json({ error: 'Invalid period parameter' });
    }

    let table = '';
    switch (type) {
        case 'flow': table = 'periodic_statistics_flow'; break;
        case 'pressure': table = 'periodic_statistics_pressure'; break;
        case 'temperature': table = 'periodic_statistics_temperature'; break;
        case 'dryness': table = 'periodic_statistics_dryness'; break;
        case 'power': table = 'periodic_statistics_power_potential'; break;
    }

    try {
        let query = `
            SELECT record_time, min_value, max_value, avg_value, stddev_value
            FROM ${table}
            WHERE period = $1
        `;

        const params = [period];

        if (period === 'daily' && month && year) {
            query += ' AND EXTRACT(MONTH FROM record_time) = $2 AND EXTRACT(YEAR FROM record_time) = $3';
            params.push(month, year);
        } else if (period === 'monthly' && year) {
            query += ' AND EXTRACT(YEAR FROM record_time) = $2';
            params.push(year);
        }

        query += ' ORDER BY record_time DESC';

        const result = await dbQuery(query, params);
        res.json(result);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
};


module.exports = { getStatistics, getGraphStatistics };
