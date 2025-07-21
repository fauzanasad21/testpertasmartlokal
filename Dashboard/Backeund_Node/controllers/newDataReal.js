const dbQuery = require('../config/db');
const NewDataReal = async (req, res) => {

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
}

module.exports = NewDataReal;
