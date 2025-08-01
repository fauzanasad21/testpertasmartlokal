const pinStore = {}; 

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

const setPin = (pin, expiryTime) => {
    pinStore[pin] = expiryTime;
};


const isPinValid = (pin) => {
    const currentTime = new Date();
    const expiryTime = pinStore[pin];

    if (expiryTime && expiryTime > currentTime) {
        delete pinStore[pin];
        return true;
    }

    if (expiryTime && expiryTime <= currentTime) {
        delete pinStore[pin];
    }

    return false;
};

module.exports = { generatePin, setPin, isPinValid };
