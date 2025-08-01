import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { logoutUser } from '../utils/logoutUser';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk mengecek autentikasi
  const checkAuth = async () => {
    try {
      //console.log('Checking authentication...');
      const response = await fetch("http://localhost:9921/api/refresh-token", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setIsAuthenticated(true);
        //console.log('User authenticated');
      } else if (response.status === 401) {
        //console.log('Authentication failed, invalid or expired token');
        await logoutUser();
        setIsAuthenticated(false);
      } else {
        console.error('Authentication failed, unknown error:', response.status);
        await logoutUser();
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      await logoutUser();
      setIsAuthenticated(false);
      //console.log('User not authenticated, redirecting to login');
    } finally {
      setLoading(false);
      //console.log('Loading complete');
    }
  };

  // UseEffect untuk pertama kali pengecekan autentikasi
  useEffect(() => {
    // Pengecekan pertama kali saat komponen dimuat
    checkAuth();

    // Interval pengecekan setiap 10 menit (600000 ms)
    const intervalId = setInterval(() => {
      checkAuth();
    }, 600000); // 600000 ms = 10 menit

    // Membersihkan interval ketika komponen di-unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    //console.log('Loading...');
    return <div>Loading...</div>;
  }

  //console.log('Authenticated:', isAuthenticated);
  // Jika autentikasi gagal, arahkan ke halaman login
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
