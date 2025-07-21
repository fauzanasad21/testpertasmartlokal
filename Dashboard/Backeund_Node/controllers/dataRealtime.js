const { getLatestData } = require('../services_WebSocket/ws');
const dbQuery = require('../config/db');


const dataRealtime = async (req, res) => {
    const latestData = getLatestData();
    if (!latestData) {
        return res.status(404).json({ error: 'Data belum tersedia' });
    }

    try {
        const query = 'SELECT data, upperlimit, bottomlimit FROM sensor_limits';
        const limits = await dbQuery(query);

        if (!limits || limits.length === 0) {
            console.error('Gagal mengambil data limits');
            return res.status(500).json({ error: 'Data sensor_limits tidak ditemukan atau kosong' });
        }

        const period = 'now';
        const queryTrend = `SELECT data_name, slope FROM recent_statistics WHERE period = '${period}'`;
        const trends = await dbQuery(queryTrend);
        const trend_status = {};

        trends.forEach(trend => {
            trend_status[trend.data_name] = { trendData: trend.slope };
        });

        const limitSettings = {};
        limits.forEach(limit => {
            limitSettings[limit.data] = {
                upperlimit: limit.upperlimit,
                bottomlimit: limit.bottomlimit
            };
        });

        const checkLimit = (value, limit) => {
            if (limit && typeof limit.upperlimit === 'number' && typeof limit.bottomlimit === 'number') {
                return value > limit.upperlimit || value < limit.bottomlimit ? 1 : 0;
            }
            return 0;
        };

        const checktrend = (slope) => {
            if (slope > 0.01) {
                return 'naik';
            } else if (slope < -0.01) {
                return 'turun';
            } else {
                return 'stabil';
            }
        };

        const response = {
            flow: {
                data: latestData.flow,
                status: checkLimit(latestData.flow, limitSettings.flow),
                trend: checktrend(trend_status.flow?.trendData)
            },
            pressure: {
                data: latestData.pressure,
                status: checkLimit(latestData.pressure, limitSettings.pressure),
                trend: checktrend(trend_status.pressure?.trendData)
            },
            temperature: {
                data: latestData.temperature,
                status: checkLimit(latestData.temperature, limitSettings.temperature),
                trend: checktrend(trend_status.temperature?.trendData)
            },
            dryness: {
                data: latestData.dryness,
                status: checkLimit(latestData.dryness, limitSettings.dryness),
                trend: checktrend(trend_status.dryness?.trendData)
            },
            power: {
                data: latestData.power_prediction,
                status: checkLimit(latestData.power_prediction, limitSettings.power_prediction),
                trend: checktrend(trend_status.power_prediction?.trendData)
            }
        };


        res.status(200).json(response);
    } catch (err) {
        console.error('Gagal mengambil data:', err);
        res.status(500).json({ error: 'Gagal mengambil data' });
    }
};

module.exports = { dataRealtime };
