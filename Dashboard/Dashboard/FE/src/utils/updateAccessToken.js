import axios from 'axios';
import Cookies from 'js-cookie';
import { logoutUser } from './logoutUser';

export const updateAccessToken = async () => {
  try {
    //console.log('Attempting to refresh access token...');
    const response = await axios.post('http://localhost:9921/api/refresh-token', {}, { withCredentials: true });

    //console.log('Access token updated successfully');
    return newAccessToken;
  } catch (error) {
    console.error('Failed to update access token:', error);
    await logoutUser();  // Logout jika refresh token gagal
    throw error;  // Lempar error untuk ditangani di interceptor
  }
};
