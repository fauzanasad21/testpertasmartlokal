import { useState } from 'react';
import LineChartComponent from '../components/LinechartComponent';
import { Box, Grid2, Container } from '@mui/material';
import BoxC from '../components/Box.jsx';
import { useTheme } from '@mui/material/styles';
import DateTimePickerComponent from '../components/DateTimePickerComponent';
import dayjs from 'dayjs';
import HistoryTableComponent from '../components/HistoryTableComponent';
import { useEffect } from 'react';


const Dashboard = () => {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState('suhu');  // State untuk jenis data yang dipilih
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'week')); // Default satu minggu sebelumnya
  const [endDate, setEndDate] = useState(dayjs()); // Default waktu saat ini
  const [data, setData] = useState({
    suhu: 0,
    tekanan: 0,
    flow: 0,
    energi: 0,
    dryness_steam: 0
  });

  const fetchRandomData = async () => {
    try {
      const response = await fetch('https://backend-agustrisa.as1.pitunnel.nethttp://localhost:9921/api/random-data');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      const defaultData = {
        suhu: 'Tidak ada Data',
        tekanan: 'Tidak ada Data',
        flow: 'Tidak ada Data',
        energi: 'Tidak ada Data',
        dryness_steam: 'Tidak ada Data'
      };
      setData(defaultData);
      console.error('Error fetching random data:', error);
    }
  };

  useEffect(() => {
    fetchRandomData(); // Panggil saat pertama kali
    const interval = setInterval(fetchRandomData, 5000); // Panggil setiap 5 detik
    return () => clearInterval(interval); // Hentikan interval saat komponen unmount
  }, []);


  return (
    <Container sx={{ marginTop: '20px', padding: 'auto', marginBottom: '100px' }}>
      <Box sx={{ flexGrow: 1 }}>
        <Grid2 container spacing={3}>
          <Grid2 size={{ xs: 6, md: 2 }} sx={{ background: theme.palette.background.paper }}>
            <BoxC title={"Dryness_Steam"} value={data?.dryness_steam} onClick={() => setSelectedType('energi')} />
          </Grid2>
          <Grid2 size={{ xs: 6, md: 2 }} sx={{ background: theme.palette.background.paper }}>
            <BoxC title={"Suhu"} value={data?.suhu} onClick={() => setSelectedType('suhu')} />
          </Grid2>
          <Grid2 size={{ xs: 6, md: 2 }} sx={{ background: theme.palette.background.paper }}>
            <BoxC title={"Tekanan"} value={data?.tekanan} onClick={() => setSelectedType('tekanan')} />
          </Grid2>
          <Grid2 size={{ xs: 6, md: 2 }} sx={{ background: theme.palette.background.paper }}>
            <BoxC title={"Flow"} value={data?.flow} onClick={() => setSelectedType('flow')} />
          </Grid2>
          <Grid2 size={{ xs: 6, md: 2 }} sx={{ background: theme.palette.background.paper }}>
            <BoxC title={"Energi"} value={data?.energi} onClick={() => setSelectedType('energi')} />
          </Grid2>
        </Grid2>
      </Box>
      <Box sx={{flexGrow: 1}}>
        <Grid2 spacing={2}>
          <Grid2>
            <h2>{selectedType}</h2>
          </Grid2>
          <Grid2>
            <LineChartComponent type={selectedType} startDate={startDate} endDate={endDate} />
          </Grid2>
          <Grid2 container spacing={3} sx={{justifyContent: 'center', margin:'20px'}}>
            <Grid2>
              <DateTimePickerComponent label='Start Date' value={startDate} onChange={setStartDate} />
            </Grid2>
            <Grid2>
              <DateTimePickerComponent label='End Date' value={endDate} onChange={setEndDate} />
            </Grid2>
          </Grid2>
          <Grid2 >
            <HistoryTableComponent startDate={startDate} endDate={endDate} />
          </Grid2>
        </Grid2>
      </Box>
      <Box >
      </Box>
      
    </Container>
  );
};

export default Dashboard;
