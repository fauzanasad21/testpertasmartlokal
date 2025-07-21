import React from 'react';
import { Gauge } from '@mui/x-charts/Gauge';
import GaugeChart from 'react-gauge-chart'

const GaugeMeter = ({ value = 0 }) => { // Default value set to 0
  if (isNaN(value) || value === undefined) {
    value = 0; // Handling invalid values
  }

  return (
    // <Gauge
    //   value={value}
    //   min={0}
    //   max={100}
    //   sx={{ width: '100vh', height: 200 }}
    // />
    <GaugeChart 
      percent={value/100} />
  );
};

export default GaugeMeter;