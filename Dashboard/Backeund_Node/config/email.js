const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    host: "smtp.gmail.com",
    port: 587,
    secure: true,
    // Mengatur timeout untuk koneksi dan pengiriman
    logger: true, // Aktifkan logger
    debug: true
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });
        console.log(`Email terkirim ke ${to}`);
    } catch (err) {
        console.error("Gagal mengirim email:", err);
    }
};

module.exports = sendEmail;
