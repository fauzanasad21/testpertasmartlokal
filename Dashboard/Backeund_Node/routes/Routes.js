const express = require('express');
const { getCalibration, setCalibration } = require('../controllers/calibration');
const dataGrafik = require('../controllers/dataGrafik');
const { dataRealtime } = require('../controllers/dataRealtime');
const { downloadHistory, history } = require('../controllers/history');
const { getLimit, outOfLimit, setLimit } = require('../controllers/limit');
const NewDataReal = require('../controllers/newDataReal');
const { getStatistics, getGraphStatistics } = require('../controllers/statistics');
const { tableStatistics, downloadTableStatistics } = require('../controllers/tableStatistics');
const {trend, trendManual} = require('../controllers/trend');
const { setRegister, setLogin, setLogout, verifyOtp } = require('../controllers/auth');
const sendPinToAdmin = require('../middleware/sendmail');
const {authMiddleware, refreshAccessToken, checkAdmin} = require('../middleware/authmiddleware');
const { dynamicRateLimiter, incrementAttempts } = require('../middleware/rateLimiter');
const { setTwall, getTwall } = require('../controllers/tWall');
const { saveDataTraining, getDataTraining, putDataTraining, deleteDataTraining } = require('../controllers/formTrainingdata');

const router = express.Router();

router.post('/request-pin',sendPinToAdmin);
router.post('/setLimit', setLimit);
//,authMiddleware, checkAdmin
router.post('/setCalibration',setCalibration);
router.post('/register',setRegister);
router.post('/verifyOtp', verifyOtp);
router.post('/setTwall',setTwall)
router.post('/login',(req,res, next) => {
    console.log('Login route hit'); 
    next(); 
},  setLogin);
router.post('/refresh-token', refreshAccessToken)
router.post('/logout',  setLogout);
router.post('/svDataTrng',   saveDataTraining);
router.get('/check-auth',authMiddleware,  (req, res) => {
    res.status(200).json({ message: "Authenticated", userId: req.userId, userName: req.user });
});

//authMiddleware
router.get('/dtaTraining', getDataTraining);
router.get('/dataCalibration', getCalibration);
router.get('/dataGrafik', dataGrafik);
router.get('/history/all', downloadHistory);
router.get('/history', history);
router.get('/getLimit', getLimit);
router.get('/statistics', getStatistics);
router.get('/statisticsGraph', getGraphStatistics);
router.get('/tableStatistics', tableStatistics);
router.get('/tableStatistics/all', downloadTableStatistics);
router.get('/trend', trend);
router.get('/trendManual', trendManual);

router.get('/getTwall',getTwall); //gadipake
router.get('/dataRealtime',dataRealtime); //gadipake
router.get('/outOfLimit',outOfLimit); //gadipake
router.get('/NewDataReal',NewDataReal); //gadipake

router.put('/chngDtaTrng',   putDataTraining);
router.delete('/dltDtaTrng',   deleteDataTraining);


module.exports = router;