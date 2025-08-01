import React, { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import { LineChart } from '@mui/x-charts/LineChart';
import axios from 'axios';
import DateTimePickerComponent from './DateTimePickerComponent';
import { TextField, Button, Grid2 } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';  // Plugin untuk UTC
import timezone from 'dayjs/plugin/timezone';  // Plugin untuk timezone

dayjs.extend(utc);  // Menggunakan plugin UTC
dayjs.extend(timezone);  // Menggunakan plugin timezone

const LineChartComponent = ({ type }) => {
  const [chartData, setChartData] = useState({ xData: [], yData: [] });
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'week')); // Default satu minggu sebelumnya
  const [endDate, setEndDate] = useState(dayjs()); // Default waktu saat ini

  // Fungsi untuk mengambil data dari backend
  const fetchData = async (startDate, endDate) => {
    try {
      const params = startDate && endDate ? {
        startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
        endDate: endDate.format('YYYY-MM-DD HH:mm:ss'),
      } : {};
      
      const response = await axios.get(`http://localhost:5000http://localhost:9921/api/data/${type}`, { params });
      const data = response.data;
      
      // Proses data dari API untuk di-render di grafik
      const xData = data.map(item => dayjs(item.timestamp).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'));  // Menggunakan field timestamp dari tabel
      const yData = data.map(item => item.value);  // Menggunakan field value dari tabel
      
      setChartData({ xData, yData });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Mengambil data saat startDate atau endDate berubah
  useEffect(() => {
    fetchData();  // Ambil data tanpa rentang tanggal untuk menampilkan 30 data terakhir
  }, [type]); 

  return (
    <Stack spacing={2}>
      <DateTimePickerComponent label='Start Date' value={startDate} onChange={setStartDate} />
      <DateTimePickerComponent label='End Date' value={endDate} onChange={setEndDate} />
      <LineChart
          xAxis={[{ data: chartData.xData, scaleType: 'point' }]}
          series={[{ data: chartData.yData }]}
          height={350}
          margin={{ top: 10, bottom: 20 }}
        />
    </Stack>
  );
};

export default LineChartComponent;
