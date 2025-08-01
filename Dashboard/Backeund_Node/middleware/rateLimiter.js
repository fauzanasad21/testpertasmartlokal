const rateLimit = require('express-rate-limit');

const calculateDelay = (attempts) => Math.min(10 * (2 ** attempts), 365 * 24 * 60 * 60 * 1000);

const dynamicRateLimiter = (req, res, next) => {
    const redisClient = req.redisClient;
    const ip = req.ip.split(':').pop();

    console.log('Rate limiter middleware called for IP:', ip);

    redisClient.get(String(ip), (err, attempts) => {
        if (err) {
            console.error('Redis error in rate limiter:', err);
            return res.status(500).json({ message: 'Error with rate limiter.' });
        }

        console.log('Redis get for rate limiting returned:', attempts);

        attempts = attempts ? parseInt(attempts) : 0;
        const delay = calculateDelay(attempts);

        console.log(`Attempts for IP ${ip}:`, attempts);

        if (attempts > 0) {
            console.log(`Rate limiting IP ${ip}, Attempts: ${attempts}`);
            return res.status(429).json({
                message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.floor(delay / 1000)} detik.`,
                retryAfter: delay / 1000
            });
        }

        console.log('Rate limiter passed for IP:', ip);
        next();
    });
};



const incrementAttempts = (req, res) => {
    const redisClient = req.redisClient;
    const ip = req.ip;

    redisClient.get(ip, (err, attempts) => {
        attempts = attempts ? parseInt(attempts) : 0;
        attempts += 1;

        const delay = calculateDelay(attempts);
        redisClient.setex(ip, delay / 1000, attempts); 

        res.status(429).json({
            message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.floor(delay / 1000)} detik.`,
            retryAfter: delay / 1000
        });
    });
};

module.exports = {
    dynamicRateLimiter,
    incrementAttempts
};
