import './App.css';
import { GlobalContext } from './context';
import { RouterProvider } from 'react-router-dom';
import { router } from './routers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function App() {
  const user = {
    username : "Terradjannah"
  }
  return (
    <div className='App'>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <GlobalContext.Provider value={user}>
          < RouterProvider router={router} />
        </GlobalContext.Provider>
      </LocalizationProvider>
    </div>
  )
}

export default App
