import React, { useEffect, useState } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import axios from 'axios';

const HistoryTableComponent = ({ startDate, endDate }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://backend-agustrisa.as1.pitunnel.nethttp://localhost:9921/api/history', {
        params: {
          startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
          endDate: endDate.format('YYYY-MM-DD HH:mm:ss'),
        },
      });
      const data = response.data.map((row, index) => ({
        id: index + 1,  // Tambahkan ID unik untuk setiap row
        timestamp: row.timestamp,
        temperature: row.temperature,
        pressure: row.pressure,
        flow: row.flow,
        energy: row.energy,
      }));
      setRows(data);
      setLoading(false);
    } catch (error) {
      console.error('Gagal mengambil data history:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [startDate, endDate]);  // Jalankan fetch ketika rentang waktu berubah

  const columns = [
    { field: 'timestamp', headerName: 'Timestamp', minWidth: 200, },
    { field: 'temperature', headerName: 'Temperature (°C)', minWidth: 150, sortable: true },
    { field: 'pressure', headerName: 'Pressure (bar)', minWidth: 150, sortable: true },
    { field: 'flow', headerName: 'Flow (m³/h)', minWidth: 150, sortable: true },
    { field: 'energy', headerName: 'Energy (kWh)', minWidth: 150,  sortable: true },
  ];

  return (
    <div style={{ height: 500, width: '100%' }}>
      <DataGrid

        rows={rows}
        columns={columns}
        loading={loading}
        pageSize={100}
        rowsPerPageOptions={[25, 50, 100]}
        components={{ Toolbar: GridToolbar }}
        filterModel={{
          items: [
            { columnField: 'timestamp', operatorValue: 'contains', value: '' },
          ],
        }}
        disableSelectionOnClick
        autosizeOptions={{
          columns: ['timestamp', 'temperature', 'pressure', 'flow', 'energy'],
          includeOutliers: true,
          includeHeaders: true,
        }}
      />
    </div>
  );
};

export default HistoryTableComponent;









