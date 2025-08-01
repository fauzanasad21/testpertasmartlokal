
const nodemailer = require('nodemailer');
const { generatePin, setPin } = require('./pinstore');
const sendEmail = require('../config/email');

const sendPinToAdmin = async (req, res) => {
    try {

        const pinNumber = generatePin();
        const expiryTime = new Date(Date.now() + 30 * 60 * 1000);
        setPin(pinNumber, expiryTime);

        const subject = 'PIN Verifikasi Pendaftaran Pengguna';
        const text = `Berikut adalah PIN untuk verifikasi pendaftaran pengguna baru: ${pinNumber}. PIN ini hanya berlaku selama 30 menit.`;
        await sendEmail(process.env.ADMIN_EMAIL, subject, text);

        console.log(`PIN ${pinNumber} telah dikirim ke email admin`);

        res.status(200).json({ message: "PIN telah dikirim ke email admin." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Gagal mengirim PIN ke email admin." });
    }
};

module.exports = sendPinToAdmin;
