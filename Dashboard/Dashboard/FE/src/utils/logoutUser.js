import axios from 'axios';

// Fungsi untuk menghapus semua cookies di browser
const deleteAllCookies = () => {
  const cookies = document.cookie.split("; ");
  for (let c = 0; c < cookies.length; c++) {
    const d = window.location.hostname.split(".");
    while (d.length > 0) {
      const cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + 
                         '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; path=/; domain=.';
      const domain = d.join(".");
      document.cookie = cookieBase + domain;
      d.shift();
    }
  }
};

export const logoutUser = async () => {
  try {
    // Kirim permintaan logout ke backend untuk menghapus token di server
    await axios.post(
      'http://localhost:9921/api/logout', 
      {}, 
      { withCredentials: true } // Sertakan cookie dengan request
    );

    // Hapus cookie dari browser setelah logout
    deleteAllCookies();
    
    // Jangan lakukan window.location.href di sini
    return true;  // Logout berhasil
  } catch (error) {
    console.error('Error during logout:', error);
    return false;  // Logout gagal
  }
};
