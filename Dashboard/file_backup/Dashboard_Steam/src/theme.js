import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
          main: '#bb86fc',
        },
        secondary: {
          main: '#03dac6',
        },
        error: {
          main: '#cf6679',
        },
        warning: {
          main: '#d64f51',
        },
        background: {
          default: '#181818',
          paper: '#2d2d2d',
        },
        success: {
          main: '#81ce85',
        },
        info: {
          main: '#6ab6d8',
        },
      },
    typography: {
      fontFamily: 'Montserrat',
      fontWeightMedium: 900,
      fontWeightBold: 1000,
      fontWeightRegular: 500,
    },
  })

  export default theme;