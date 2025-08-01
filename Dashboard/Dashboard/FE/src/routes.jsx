
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FlowPage from './pages/FlowPage';
import TemperaturePage from './pages/TemperaturePage';
import PressurePage from './pages/PressurePage';
import DrynessPage from './pages/DrynessPage';
import PowerPage from './pages/PowerPage';
import RootLayout from './layout/RootLayout'
import Kalibrasi from './pages/kalibrasi';
import Batas from './pages/Batas';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import FormDtaTrng from './pages/FormTrainingDta';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, 
    children: [
      {
        index: true, 
        element: <Navigate to="/dashboard" replace /> 
      },
      
      { path: "/dashboard", element: <ProtectedRoute><Dashboard /> </ProtectedRoute>},
      { path: "/analytic/flow", element: <ProtectedRoute><FlowPage /></ProtectedRoute> },
      { path: "/analytic/temperature", element: <ProtectedRoute><TemperaturePage /></ProtectedRoute>  },
      { path: "/analytic/pressure", element: <ProtectedRoute><PressurePage /> </ProtectedRoute> },
      { path: "/analytic/dryness", element: <ProtectedRoute><DrynessPage /></ProtectedRoute>  },
      { path: "/analytic/power", element: <ProtectedRoute><PowerPage /></ProtectedRoute>  },
      { path: "/calibration", element: <ProtectedRoute><Kalibrasi /></ProtectedRoute>  },
      { path: "/limit", element: <ProtectedRoute><Batas /></ProtectedRoute>  },
      { path: "/FormDtaTrng", element: <ProtectedRoute><FormDtaTrng /></ProtectedRoute>  },
    ],
  },
  {
    path: "/login",
    element: <Login />, 
  },
  { path: "/register", element: <Register /> }, 
]);