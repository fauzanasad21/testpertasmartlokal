const dbQuery = require('../config/db');
const Joi = require('joi');

const schema = Joi.object({
    temperature: Joi.number().required().messages({
        'number.base': 'Temperature must be a number',
        'any.required': 'Temperature is required',
    }),
    pressure: Joi.number().required().messages({
        'number.base': 'Pressure must be a number',
        'any.required': 'Pressure is required',
    }),
    flow: Joi.number().required().messages({
        'number.base': 'Flow must be a number',
        'any.required': 'Flow is required',
    }),
    dryness: Joi.number().required().messages({
        'number.base': 'Dryness must be a number',
        'any.required': 'Dryness is required',
    }),
});

const saveDataTraining = async (req, res) => {
    const {temperature, pressure, flow, dryness } = req.body;


    try {

        const { error } = schema.validate({temperature, pressure, flow, dryness})
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const query = `
        INSERT INTO testrainingdata (temperature, pressure, flow, dryness) VALUES ($1, $2, $3, $4) RETURNING *
        `
        const result = await dbQuery(query,[temperature, pressure, flow, dryness])
        console.log('idnya1 = ', result)
        const userId = result[0].id;
        console.log('idnya2 = ', userId)
        console.log('============================')
        res.status(200).json({ message: 'User created successfully', id: userId });
    }
    catch {
        res.status(500).json('cant save data')
    }
}

const getDataTraining = async (req, res) => {
    try {
        const query = `
            SELECT * FROM testrainingdata ORDER BY id ASC
        `

        const result = await dbQuery(query)
        res.status(200).json(result)
    }
    catch {
        res.status(500).json('cant get data')
    }
}

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
}

const deleteDataTraining = async (req, res) => {
    const { id } = req.query;
    console.log('id delete = ', id)
    try {

        const query = `
            DELETE FROM testrainingdata WHERE id = $1 RETURNING *
        `
        const result = await dbQuery(query,[id])
        console.log('datanya = ', result)
        if (!result ) {
            return res.status(500).json({ error: 'No result returned from query' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Data not found' });
        }
        res.json({ message: 'Data deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: error.details[0].message });
    }
}
//training_data
module.exports = {getDataTraining, saveDataTraining, putDataTraining, deleteDataTraining}