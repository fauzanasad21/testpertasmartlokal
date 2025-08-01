/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import { LineChart } from '@mui/x-charts/LineChart';
import axios from 'axios';
import { TextField, Button, Grid2 } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';  // Plugin untuk UTC
import timezone from 'dayjs/plugin/timezone';  // Plugin untuk timezone

dayjs.extend(utc);  // Menggunakan plugin UTC
dayjs.extend(timezone);  // Menggunakan plugin timezone

const LineChartComponent = ({ type, startDate, endDate }) => {
  const [chartData, setChartData] = useState({ xData: [], yData: [] });

  // Fungsi untuk mengambil data dari backend
  const fetchData = async (startDate, endDate) => {
    try {
      let params = {};

      // Jika startDate dan endDate tersedia, kita tambahkan sebagai parameter untuk mengambil data berdasarkan range
      if (startDate && endDate) {
        params = {
          startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
          endDate: endDate.format('YYYY-MM-DD HH:mm:ss'),
        };
      }

      // Request ke API
      const response = await axios.get(`https://backend-agustrisa.as1.pitunnel.nethttp://localhost:9921/api/data/${type}`, { params });
      const data = response.data;

      // Proses data dari API untuk di-render di grafik
      const xData = data.map(item => dayjs(item.timestamp).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'));  // Menggunakan field timestamp dari tabel
      const yData = data.map(item => item.value);  // Menggunakan field value dari tabel

      setChartData({ xData, yData });
      console.log(startDate);
      console.log(endDate);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Mengambil data saat startDate, endDate, atau type berubah
  useEffect(() => {
    // Jika startDate dan endDate tidak diisi, ambil 30 data terakhir
    if (!startDate || !endDate) {
      fetchData(); // Memanggil tanpa range tanggal untuk menampilkan 30 data terakhir
    } else {
      fetchData(startDate, endDate); // Memanggil dengan range tanggal jika tersedia
    }
  }, [startDate, endDate, type]);  // Dependensi pada startDate, endDate, dan type

  return (
    <Stack spacing={2}>
      <Stack sx={{ width: '100%' }}>
        <LineChart
          xAxis={[{ data: chartData.xData, scaleType: 'point' }]}
          series={[{ data: chartData.yData }]}
          height={350}
          margin={{ top: 10, bottom: 20 }}
        />
        <Grid2 container spacing={2} justifyContent="center" alignItems="center" sx={{marginTop:'50px'}}>
          <Grid2 item>
          </Grid2>
          <Grid2 item>
          </Grid2>
        </Grid2>
      </Stack>
    </Stack>
  );
};

export default LineChartComponent;
