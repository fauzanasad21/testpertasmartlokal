const bcrypt = require('bcrypt');
const dbQuery = require('../config/db');
const { isPinValid } = require('../middleware/pinstore');
const { JWT_REFRESH_SECRET,JWT_SECRET , jwt } = require('../config/auth');
const saltRounds = 10;


const setRegister = async (req, res) => {
    let { full_name, password, pin_number } = req.body;

    // Ubah full_name menjadi huruf kecil
    full_name = full_name.toLowerCase();

    if (/\s/.test(full_name)) {
        return res.status(400).json({ message: "Nama lengkap tidak boleh mengandung spasi." });
    }

    const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Password harus memiliki minimal 1 huruf besar, 1 angka, dan 1 karakter khusus." });
    }

    if (!isPinValid(pin_number)) {
        return res.status(403).json({ message: "Pin number tidak valid atau sudah kadaluarsa." });
    }

    try {
        // Periksa apakah full_name sudah digunakan
        const checkUserQuery = `SELECT COUNT(*) FROM users WHERE full_name = $1`;
        const { rows } = await dbQuery(checkUserQuery, [full_name]);

        if (rows[0].count > 0) {
            return res.status(409).json({ message: "Nama lengkap sudah digunakan." });
        }

        // Hash password dan simpan data pengguna baru
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const insertUserQuery = `INSERT INTO users (full_name, password, pin_number) VALUES ($1, $2, $3)`;
        await dbQuery(insertUserQuery, [full_name, hashedPassword, pin_number]);

        res.status(201).json({ message: "Pengguna berhasil didaftarkan." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



const setLogin = async (req, res) => {
    const redisClient = req.redisClient;
    const { full_name, password } = req.body;
    full_name = full_name.toLowerCase();
    try {
        console.time('SQL Query Operation');
        const sql = `SELECT * FROM users WHERE full_name = $1`;
        const results = await dbQuery(sql, [full_name]);
        console.timeEnd('SQL Query Operation');

        if (results.length === 0) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        const user = results[0];
        console.time('Password Compare Operation');
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.timeEnd('Password Compare Operation');

        if (!passwordMatch) {
            return res.status(401).json({ message: "Password salah." });
        }

        const payload = {id: user.id, full_name: user.full_name, role: user.role };
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

        await redisClient.del(user.full_name);

        await redisClient.set(user.full_name, refreshToken);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 900000  
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.json({ message: "Login berhasil." });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err });
    }
};


const setLogout = (req, res) => {
    const redisClient = req.redisClient;
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        console.log('No refresh token found in cookies');
        return res.status(400).json({ message: 'No session found.' });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) {
            console.error('Invalid token error:', err);
            return res.status(401).json({ message: 'Invalid token' });
        }

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: true,  
            sameSite: 'None',
            path: '/'
        });
        console.log('accessToken cookie cleared');

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,  
            sameSite: 'None',
            path: '/'
        });
        console.log('refreshToken cookie cleared');

        res.status(200).json({ message: 'Logout berhasil' });

        redisClient.del(decoded.full_name, (err) => {
            if (err) {
                console.error('Redis del error:', err);
                return; 
            }
            console.log('Redis del success for user:', decoded.full_name);
        });
    });
};




module.exports = { setRegister, setLogin, setLogout };
