const nodemailer = require('nodemailer');
const sendEmail = require('../config/email'); // Pastikan sendEmail diatur dengan benar

const sendPinToAdmin = async (username, pinNumber) => {
    try {
        const subject = 'PIN Verifikasi Pendaftaran Pengguna';
        const text = `Berikut adalah PIN untuk verifikasi pendaftaran pengguna baru:

Username: ${username}
PIN: ${pinNumber}

PIN ini hanya berlaku selama 30 menit.`;

        console.log("[sendPinToAdmin] Sending email...");
        await sendEmail(process.env.ADMIN_EMAIL, subject, text);
        console.log(`PIN ${pinNumber} untuk pengguna ${username} telah dikirim ke email admin.`);
    } catch (err) {
        console.error('Gagal mengirim PIN ke email admin:', err);
        throw new Error('Gagal mengirim PIN ke email admin.');
    }
};

module.exports = sendPinToAdmin;
