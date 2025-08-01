const { jwt, JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/auth');


const authMiddleware = (req, res, next) => {
    const redisClient = req.redisClient;
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
  
    if (!accessToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    jwt.verify(accessToken, JWT_SECRET, (err, decoded) => {
      if (err && err.name === 'TokenExpiredError' && refreshToken) {
        jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decodedRefresh) => {
          if (err) {
            return res.status(401).json({ message: 'Invalid refresh token' });
          }
  
          const storedRefreshToken = await redisClient.get(decodedRefresh.full_name);
          if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
          }
  
          const newAccessToken = jwt.sign({ id: decodedRefresh.id }, JWT_SECRET, { expiresIn: '15m' });
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 900000,
          });
          req.userId = decodedRefresh.id;
          next();
        });
      } else if (err) {
        return res.status(401).json({ message: 'Unauthorized' });
      } else {
        req.userId = decoded.id;
        next();
      }
    });
  };

  const refreshAccessToken = async (req, res) => {
    const redisClient = req.redisClient;
    const refreshToken = req.cookies.refreshToken;
  
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token found.' });
    }
  
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decodedRefresh) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid refresh token.' });
      }
  
      const storedRefreshToken = await redisClient.get(decodedRefresh.full_name);
      if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
        return res.status(401).json({ message: 'Session invalid. Please log in again.' });
      }
  
      // Jika refresh token valid, buat access token baru
      const newAccessToken = jwt.sign({ id: decodedRefresh.id }, JWT_SECRET, { expiresIn: '15m' });
  
      // Kirim access token baru ke cookie
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 900000, // 15 menit
      });
  
      res.status(200).json({ message: 'Access token updated successfully.' });
    });
  };
  
  const checkAdmin = (req, res, next) => {
    const refreshToken = req.cookies.refreshToken;
  
    if (!refreshToken) {
      return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
    }
  
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Token tidak valid.' });
      }
  
      // Pastikan `req.user` diatur setelah token terverifikasi
      req.user = decoded;
  
      // Periksa apakah user memiliki role admin
      if (req.user && req.user.role === 'admin') {
        return next(); // Lanjutkan ke handler rute berikutnya
      }
  
      return res.status(403).json({ message: 'Akses ditolak. Hanya admin yang diperbolehkan.' });
    });
  };

  


module.exports = {authMiddleware, refreshAccessToken, checkAdmin};