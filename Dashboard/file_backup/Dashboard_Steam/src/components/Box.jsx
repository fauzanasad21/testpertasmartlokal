/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Box, Typography, Grid2 } from '@mui/material';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import CompressIcon from '@mui/icons-material/Compress';
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import BoltIcon from '@mui/icons-material/Bolt';
import DryIcon from '@mui/icons-material/Dry';
import GaugeMeter from './GaugeMeter';
import { motion } from 'framer-motion';

const BoxC = memo(({ title, value, onClick }) => {
  let IconComponent;

  // Tentukan ikon berdasarkan title
  switch(title.toLowerCase()) {
    case 'suhu':
      IconComponent = DeviceThermostatIcon;
      break;
    case 'tekanan':
      IconComponent = CompressIcon;
      break;
    case 'flow':
      IconComponent = DoubleArrowIcon;
      break;
    case 'energi':
      IconComponent = BoltIcon;
      break;
    case 'dryness_steam':
      IconComponent = DryIcon;
      break;
    default:
      IconComponent = null;
  }

  return (
    <motion.div 
      onClick={onClick}
      animate={{ scale: 1.05 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      whileHover={{ scale: 1.1 }}
      style={{
        border: '1px solid gray',
        padding: '16px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'background-color 0.3s, box-shadow 0.3s'
      }}
    >
      {/* Layout dengan Grid yang terpusat */}
      <Grid2  
        spacing={2} 
        sx={{ 
          height: 'auto', 
          justifyContent: 'center',   // Horizontal center alignment
          alignItems: 'center',       // Vertical center alignment
          flexDirection: 'column',    // Make the items stack vertically
        }}
      >
        <Grid2 item xs={12}>
          {IconComponent && <IconComponent fontSize="large" />}
        </Grid2>
        <Grid2 item xs={12}>
          <Typography variant="h6">{title}</Typography>
        </Grid2>
        <Grid2 item xs={12}>
        <motion.Typography variant="h6"          
          key={value}
          animate={{ opacity: [0, 1], y: [-10, 0] }}
          transition={{ duration: 0.5 }}
        >{value}</motion.Typography>
        </Grid2>
        <Grid2 item xs={12}>
          <motion.div           
          animate={{ opacity: [0, 1], y: [-10, 0] }}
          transition={{ duration: 0.5 }}>
            <GaugeMeter value={value} />
          </motion.div>
        </Grid2>
      </Grid2>
    </motion.div>
  );
},  (prevProps, nextProps) => {
  // Hanya re-render jika nilai value berubah
  return prevProps.value === nextProps.value;
});

export default BoxC;
