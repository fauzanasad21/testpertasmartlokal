const bcrypt = require('bcrypt');
const dbQuery = require('../config/db');
const sendPinToAdmin = require('../middleware/sendmail')
const { isPinValid,generatePin } = require('../middleware/pinstore');

const { JWT_REFRESH_SECRET,JWT_SECRET , jwt } = require('../config/auth');
const saltRounds = 10;



const setRegister = async (req, res) => {
    // Log request body untuk debug
    console.log("==[setRegister] Incoming Request Body==", req.body);

    let { full_name, password } = req.body;

    // Ubah full_name menjadi huruf kecil
    if (full_name) {
        full_name = full_name.toLowerCase();
    }

    // Cek apakah full_name mengandung spasi
    if (/\s/.test(full_name)) {
        console.error("[setRegister] Error: Nama lengkap mengandung spasi");
        return res.status(400).json({ message: "Nama lengkap tidak boleh mengandung spasi." });
    }

    // Validasi password
    const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!passwordRegex.test(password)) {
        console.error("[setRegister] Error: Password tidak sesuai kriteria");
        return res.status(400).json({ message: "Password harus memiliki minimal 1 huruf besar, 1 angka, dan 1 karakter khusus." });
    }

    try {
        // Periksa apakah full_name sudah digunakan
        console.log("[setRegister] Checking existing user:", full_name);
        const checkUserQuery = `SELECT COUNT(*) FROM users WHERE full_name = $1`;
        const rows = await dbQuery(checkUserQuery, [full_name]);

        console.log("[setRegister] dbQuery result:", rows);

        if (!rows || rows.length === 0) {
            console.error("[setRegister] Error: Query tidak mengembalikan hasil.");
            return res.status(500).json({ message: "Terjadi kesalahan pada server." });
        }

        if (parseInt(rows[0].count, 10) > 0) {
            console.error("[setRegister] Error: Nama lengkap sudah digunakan.");
            return res.status(409).json({ message: "Nama lengkap sudah digunakan." });
        }

        // Hash password
        console.log("[setRegister] Hashing password...");
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log("[setRegister] Password hashed successfully.");

        // Buat entri pengguna dengan status 'pending'
        console.log("[setRegister] Inserting user with status 'pending'...");
        const insertUserQuery = `
            INSERT INTO users (full_name, password, statusactive) 
            VALUES ($1, $2, 'pending') 
            RETURNING id`;
        const insertResult = await dbQuery(insertUserQuery, [full_name, hashedPassword]);

        console.log("[setRegister] Insert result:", insertResult);

        const userId = insertResult[0].id; // Mengakses index 0 dari array rows
        console.log("[setRegister] New user inserted. ID:", userId);

        // Generate OTP terkait username
        const pinNumber = generatePin();  // Pastikan fungsi generatePin tersedia
        const expiryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 menit
        console.log("[setRegister] Generated PIN:", pinNumber, "Expiry:", expiryTime);

        // Simpan OTP di database (tabel otp)
        console.log("[setRegister] Inserting OTP into database...");
        const insertOtpQuery = `
            INSERT INTO otp (user_id, pin_number, expiry_time) 
            VALUES ($1, $2, $3)`;
        await dbQuery(insertOtpQuery, [userId, pinNumber, expiryTime]);
        console.log("[setRegister] OTP inserted into database.");

        // Kirim OTP ke admin dengan menyertakan username
        console.log("[setRegister] Sending PIN to admin...");
        await sendPinToAdmin(full_name, pinNumber);
        console.log("[setRegister] PIN sent to admin successfully.");

        res.status(201).json({
            message: "Registrasi berhasil. OTP telah dikirim ke admin untuk verifikasi."
        });
    } catch (err) {
        console.error("[setRegister] Internal Server Error:", err);
        res.status(500).json({ error: err.message });
    }
};
const verifyOtp = async (req, res) => {
    console.log("==[verifyOtp] Incoming Request Body==", req.body);

    let { full_name, pin_number } = req.body;
    if (full_name) {
        full_name = full_name.toLowerCase();
    }
    try {
        // Cari pengguna dengan username yang diberikan dan status 'pending'
        console.log("[verifyOtp] Checking user status for:", full_name);
        const userQuery = `
            SELECT id FROM users 
            WHERE full_name = $1 
              AND statusactive = 'pending'
        `;
        const userResult = await dbQuery(userQuery, [full_name]);

        // Log hasil query user
        console.log("[verifyOtp] User query result:", userResult);

        if (userResult.length === 0) {
            console.error("[verifyOtp] Error: Pengguna tidak ditemukan atau sudah diverifikasi.");
            return res.status(404).json({
                message: "Pengguna tidak ditemukan atau sudah diverifikasi."
            });
        }

        const userId = userResult[0].id; // Ambil ID pengguna dari hasil query
        console.log("[verifyOtp] Found user ID:", userId);

        // Cari OTP yang valid untuk pengguna tersebut
        console.log("[verifyOtp] Checking valid OTP for user ID:", userId);
        const otpQuery = `
            SELECT * FROM otp 
            WHERE user_id = $1 
              AND pin_number = $2 
              AND expiry_time > NOW()
        `;
        const otpResult = await dbQuery(otpQuery, [userId, pin_number]);

        // Log hasil query OTP
        console.log("[verifyOtp] OTP query result:", otpResult);

        if (otpResult.length === 0) {
            console.error("[verifyOtp] Error: PIN tidak valid atau sudah kadaluarsa.");
            return res.status(400).json({
                message: "PIN tidak valid atau sudah kadaluarsa."
            });
        }

        // Update status pengguna menjadi 'active'
        console.log("[verifyOtp] Updating user status to 'active'...");
        const updateUserQuery = `
            UPDATE users 
            SET statusactive = 'active' 
            WHERE id = $1
        `;
        await dbQuery(updateUserQuery, [userId]);
        console.log("[verifyOtp] User status updated to 'active'.");

        // Hapus OTP yang telah digunakan
        console.log("[verifyOtp] Deleting used OTP from database...");
        const deleteOtpQuery = `DELETE FROM otp WHERE user_id = $1`;
        await dbQuery(deleteOtpQuery, [userId]);
        console.log("[verifyOtp] OTP deleted.");

        res.status(200).json({ message: "Pengguna berhasil diverifikasi dan diaktifkan." });
    } catch (err) {
        console.error("[verifyOtp] Internal Server Error:", err);
        res.status(500).json({ error: err.message });
    }
};




const setLogin = async (req, res) => {
    const redisClient = req.redisClient;
    let { full_name, password } = req.body;
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




module.exports = { setRegister, setLogin, setLogout, verifyOtp };
