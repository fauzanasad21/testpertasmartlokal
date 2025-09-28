// const dbQuery = require('../config/db');
// const Joi = require('joi');

// const schema = Joi.object({
//     timestamp: Joi.date().iso().required().messages({
//         'date.base': 'Timestamp must be a valid date',
//         'date.format': 'Timestamp must be in ISO 8601 format (YYYY-MM-DD)',
//         'any.required': 'Timestamp is required',
//     }),
//     temperature: Joi.number().required().messages({
//         'number.base': 'Temperature must be a number',
//         'any.required': 'Temperature is required',
//     }),
//     pressure: Joi.number().required().messages({
//         'number.base': 'Pressure must be a number',
//         'any.required': 'Pressure is required',
//     }),
//     flow: Joi.number().required().messages({
//         'number.base': 'Flow must be a number',
//         'any.required': 'Flow is required',
//     }),
//     dryness: Joi.number().required().messages({
//         'number.base': 'Dryness must be a number',
//         'any.required': 'Dryness is required',
//     }),
// });

// const saveDataTraining = async (req, res) => {
//     const {temperature, pressure, flow, dryness } = req.body;


//     try {

//         const { error } = schema.validate({temperature, pressure, flow, dryness})
//         if (error) {
//             return res.status(400).json({ error: error.details[0].message });
//         }

//         const query = `
//         INSERT INTO testrainingdata (timestamp, temperature, pressure, flow, dryness) VALUES ($1, $2, $3, $4, $5) RETURNING *
//         `
//         const result = await dbQuery(query,[temperature, pressure, flow, dryness])
//         console.log('idnya1 = ', result)
//         const userId = result[0].id;
//         console.log('idnya2 = ', userId)
//         console.log('============================')
//         res.status(200).json({ message: 'User created successfully', id: userId });
//     }
//     catch {
//         res.status(500).json('cant save data')
//     }
// }

// const getDataTraining = async (req, res) => {
//     try {
//         const query = `
//             SELECT * FROM testrainingdata ORDER BY id ASC
//         `

//         const result = await dbQuery(query)
//         res.status(200).json(result)
//     }
//     catch {
//         res.status(500).json('cant get data')
//     }
// }

// const putDataTraining = async (req, res) => {
//     const {id} = req.query

//     console.log('req.query:', req.query);
//     console.log('id:', req.query.id);
//     if (!id) {
//         return res.status(400).json({ error: 'ID is required' });
//     }
//     const {temperature, pressure, flow, dryness } = req.body;

//     try{
//         const { error } = schema.validate({temperature, pressure, flow, dryness})
//         if (error) {
//             return res.status(400).json({ error: error.details[0].message });
//         }
//         const query = `
//             UPDATE testrainingdata SET temperature = $1, pressure = $2, flow = $3, dryness = $4 WHERE id = $5 RETURNING *
//         `
//         const result = await dbQuery(query, [temperature, pressure, flow, dryness, id])
//         if (!result || !result.rows) {
//             return res.status(500).json({ error: 'No result returned from query' });
//         }

//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Data not found' });
//         }
//         res.status(200).json(result)
//     }
//     catch (err) {
//         console.error('Error executing query:', err);
//         res.status(500).json('cant get data')
//     }
// }

// const deleteDataTraining = async (req, res) => {
//     const { id } = req.query;
//     console.log('id delete = ', id)
//     try {

//         const query = `
//             DELETE FROM testrainingdata WHERE id = $1 RETURNING *
//         `
//         const result = await dbQuery(query,[id])
//         console.log('datanya = ', result)
//         if (!result ) {
//             return res.status(500).json({ error: 'No result returned from query' });
//         }

//         if (result.length === 0) {
//             return res.status(404).json({ error: 'Data not found' });
//         }
//         res.json({ message: 'Data deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: error.details[0].message });
//     }
// }
// //training_data
// module.exports = {getDataTraining, saveDataTraining, putDataTraining, deleteDataTraining, getChartData}


const dbQuery = require('../config/db');
const Joi = require('joi');
const axios = require('axios');

const schema = Joi.object({
    timestamp: Joi.date().iso().required().messages({
        'date.base': 'Timestamp must be a valid date',
        'date.format': 'Timestamp must be in ISO 8601 format (YYYY-MM-DD)',
        'any.required': 'Timestamp is required',
    }),
    temperature: Joi.number().required(),
    pressure: Joi.number().required(),
    flow: Joi.number().required(),
    dryness: Joi.number().required(),
});

const saveDataTraining = async (req, res) => {
    const { timestamp, temperature, pressure, flow, dryness } = req.body;
    try {
        const { error } = schema.validate({ timestamp, temperature, pressure, flow, dryness });
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const insertQuery = `
        INSERT INTO testrainingdata (timestamp, temperature, pressure, flow, dryness) VALUES ($1, $2, $3, $4, $5) RETURNING id
        `;
        const result = await dbQuery(insertQuery, [timestamp, temperature, pressure, flow, dryness]);
        const insertedDataId = result[0].id;
        console.log(`Initial data saved with ID: ${insertedDataId}`);
        try {
            const pythonApiUrl = 'http://localhost:5000/predict';
            const featuresForPrediction = { temperature, pressure, flow };
            const predictionResponse = await axios.post(pythonApiUrl, featuresForPrediction);
            const { predicted_dryness } = predictionResponse.data;
            const updateQuery = `
                UPDATE testrainingdata
                SET predicted_dryness = $1
                WHERE id = $2
            `;
            await dbQuery(updateQuery, [predicted_dryness, insertedDataId]);
            console.log(`Prediction ${predicted_dryness} saved for ID ${insertedDataId}`);
        } catch (predictionError) {
            console.error("Error during ML prediction step:", predictionError.message);
        }
        res.status(200).json({ message: 'Data saved and prediction processed', id: insertedDataId });
    }
    catch (err) {
        console.error('Error in saveDataTraining:', err);
        res.status(500).json('Could not save data');
    }
};

const getDataTraining = async (req, res) => {
    // ... (kode fungsi ini tetap sama)
    try {
        const query = `SELECT * FROM testrainingdata ORDER BY id ASC`;
        const result = await dbQuery(query);
        res.status(200).json(result);
    }
    catch {
        res.status(500).json('cant get data');
    }
};

const getChartData = async (req, res) => {
    try {
        const query = `
            SELECT timestamp, dryness, predicted_dryness 
            FROM testrainingdata 
            WHERE dryness IS NOT NULL AND predicted_dryness IS NOT NULL
            ORDER BY timestamp ASC
        `;
        const result = await dbQuery(query);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching chart data:', err);
        res.status(500).json('cant get chart data');
    }
};

const putDataTraining = async (req, res) => {
    const {id} = req.query

    console.log('req.query:', req.query);
    console.log('id:', req.query.id);
    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }
    const {temperature, pressure, flow, dryness } = req.body;

    try{
        const { error } = schema.validate({temperature, pressure, flow, dryness})
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        const query = `
            UPDATE testrainingdata SET temperature = $1, pressure = $2, flow = $3, dryness = $4 WHERE id = $5 RETURNING *
        `
        const result = await dbQuery(query, [temperature, pressure, flow, dryness, id])
        if (!result || !result.rows) {
            return res.status(500).json({ error: 'No result returned from query' });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }
        res.status(200).json(result)
    }
    catch (err) {
        console.error('Error executing query:', err);
        res.status(500).json('cant get data')
    }
};

const deleteDataTraining = async (req, res) => {
  const { id } = req.query;
  console.log('id delete = ', id);

  try {
    // 1. Pastikan idsToDelete selalu array dan berisi angka
    const idsToDelete = (Array.isArray(id) ? id : [id]).map(Number);

    if (idsToDelete.length === 0) {
      return res.status(400).json({ error: 'No IDs provided for deletion.' });
    }

    // 2. Buat placeholder dinamis untuk query 'IN' (e.g., $1, $2, $3)
    const placeholders = idsToDelete.map((_, i) => `$${i + 1}`).join(',');

    // 3. Gunakan query 'IN' yang lebih fleksibel
    const query = `
      DELETE FROM testrainingdata WHERE id IN (${placeholders}) RETURNING *
    `;
    
    // 4. Kirim array ID secara langsung sebagai parameter
    const result = await dbQuery(query, idsToDelete);
    
    if (!result) {
      return res.status(500).json({ error: 'No result returned from query' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Data not found' });
    }
    
    res.json({ message: 'Data deleted successfully' });

  } catch (err) {
    console.error('Error deleting data:', err);
    res.status(500).json({ error: 'An error occurred while deleting data.' });
  }
};


module.exports = {getDataTraining, saveDataTraining, putDataTraining, deleteDataTraining, getChartData}
